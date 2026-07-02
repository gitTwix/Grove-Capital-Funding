export default {
    async fetch(request, env) {

        // =================================================================
        // SECRETS & CONFIG
        // =================================================================
        const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
        const SESSION_SECRET = env.SESSION_SECRET;
        const SESSION_EXPIRY = 60 * 60 * 1000; // 1 hour

        // =================================================================
        // HELPERS
        // =================================================================
        const loginAttempts = new Map();

        function generateToken(password, timestamp) {
            const raw = `${password}:${timestamp}:${SESSION_SECRET}`;
            return btoa(raw);
        }

        function validateToken(token) {
            try {
                const decoded = atob(token);
                const parts = decoded.split(':');
                const password = parts[0];
                const timestamp = parts[1];
                const secret = parts[2];

                if (password !== ADMIN_PASSWORD) return false;
                if (secret !== SESSION_SECRET) return false;

                const tokenAge = Date.now() - parseInt(timestamp);
                if (tokenAge > SESSION_EXPIRY) return false;

                return true;
            } catch {
                return false;
            }
        }

        function isRateLimited(ip) {
            const now = Date.now();
            const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
            if (now - attempts.firstAttempt > 15 * 60 * 1000) {
                loginAttempts.delete(ip);
                return false;
            }
            return attempts.count >= 5;
        }

        function recordLoginAttempt(ip) {
            const now = Date.now();
            const attempts = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
            attempts.count++;
            loginAttempts.set(ip, attempts);
        }

        // =================================================================
        // CORS HEADERS
        // =================================================================
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // =================================================================
        // ADMIN - LOGIN
        // =================================================================
        if (url.pathname === '/admin/login' && request.method === 'POST') {
            const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

            if (isRateLimited(ip)) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Too many login attempts. Please wait 15 minutes.'
                }), {
                    status: 429,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            try {
                const body = await request.json();
                const { password } = body;

                if (password !== ADMIN_PASSWORD) {
                    recordLoginAttempt(ip);
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'Incorrect password.'
                    }), {
                        status: 401,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const timestamp = Date.now();
                const token = generateToken(password, timestamp);

                return new Response(JSON.stringify({
                    success: true,
                    token,
                    expiresIn: SESSION_EXPIRY
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Invalid request'
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // =================================================================
        // ADMIN - LIST SUBMISSIONS
        // =================================================================
        if (url.pathname === '/admin/submissions' && request.method === 'GET') {
            const token = request.headers.get('x-admin-token');

            if (!token || !validateToken(token)) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Unauthorized. Please log in again.'
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            try {
                const listed = await env.GROVE_BUCKET.list();
                const metadataFiles = listed.objects.filter(obj =>
                    obj.key.endsWith('/metadata.json')
                );

                const submissions = [];

                for (const obj of metadataFiles) {
                    const file = await env.GROVE_BUCKET.get(obj.key);
                    if (file) {
                        const metadata = await file.json();

                        const fieldsKey = `${metadata.submissionId}/fields.json`;
                        const fieldsFile = await env.GROVE_BUCKET.get(fieldsKey);
                        const fields = fieldsFile ? await fieldsFile.json() : {};

                        // Mask SSN before sending
                        if (fields.owner1_ssn) {
                            fields.owner1_ssn = '***-**-' + fields.owner1_ssn.slice(-4);
                        }
                        if (fields.owner2_ssn) {
                            fields.owner2_ssn = '***-**-' + fields.owner2_ssn.slice(-4);
                        }

                        // Remove signature data from list view
                        delete fields.owner1_signature_data;
                        delete fields.owner2_signature_data;

                        submissions.push({ ...metadata, fields });
                    }
                }

                submissions.sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                );

                return new Response(JSON.stringify({
                    success: true,
                    submissions
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    message: error.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // =================================================================
        // ADMIN - DOWNLOAD FILE
        // =================================================================
        if (url.pathname === '/admin/download' && request.method === 'GET') {
            const token = url.searchParams.get('token');

            if (!token || !validateToken(token)) {
                return new Response('Unauthorized. Session expired or invalid.', {
                    status: 401
                });
            }

            const submissionId = url.searchParams.get('submissionId');
            const fileName = url.searchParams.get('file');

            if (!submissionId || !fileName) {
                return new Response('Missing parameters', { status: 400 });
            }

            // Prevent path traversal attacks
            if (
                fileName.includes('..') ||
                fileName.includes('/') ||
                submissionId.includes('..')
            ) {
                return new Response('Invalid parameters', { status: 400 });
            }

            try {
                const fileKey = `${submissionId}/${fileName}`;
                const file = await env.GROVE_BUCKET.get(fileKey);

                if (!file) {
                    return new Response('File not found', { status: 404 });
                }

                const headers = new Headers();
                headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
                headers.set('Content-Type', file.httpMetadata?.contentType || 'application/octet-stream');
                headers.set('Access-Control-Allow-Origin', '*');
                headers.set('X-Content-Type-Options', 'nosniff');

                return new Response(file.body, { headers });

            } catch (error) {
                return new Response('Download failed', { status: 500 });
            }
        }

        // =================================================================
        // ADMIN - DELETE SUBMISSION
        // =================================================================
        if (url.pathname === '/admin/delete' && request.method === 'DELETE') {
            const token = request.headers.get('x-admin-token');

            if (!token || !validateToken(token)) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Unauthorized. Please log in again.'
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            try {
                const body = await request.json();
                const { submissionId } = body;

                if (!submissionId || submissionId.includes('..')) {
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'Invalid submission ID.'
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // List all files for this submission
                const listed = await env.GROVE_BUCKET.list({ prefix: `${submissionId}/` });

                // Delete all files belonging to this submission
                for (const obj of listed.objects) {
                    await env.GROVE_BUCKET.delete(obj.key);
                    console.log(`🗑️ Deleted: ${obj.key}`);
                }

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Submission deleted successfully.'
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    message: error.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // =================================================================
        // FORM SUBMISSION - POST ONLY
        // =================================================================
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({
                success: false,
                message: 'Method not allowed'
            }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            const formData = await request.formData();

            const submissionId = `gcf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date().toISOString();

            // =================================================================
            // STORE FILES IN R2
            // =================================================================
            const uploadedFiles = [];
            const files = formData.getAll('documents_upload');

            for (const file of files) {
                if (file instanceof File) {
                    const fileName = `${submissionId}/${file.name}`;
                    const fileBuffer = await file.arrayBuffer();

                    await env.GROVE_BUCKET.put(fileName, fileBuffer, {
                        httpMetadata: { contentType: file.type },
                        customMetadata: {
                            submissionId,
                            originalName: file.name,
                            uploadedAt: timestamp
                        }
                    });

                    uploadedFiles.push(file.name);
                    console.log(`✅ Uploaded: ${fileName}`);
                }
            }

            // =================================================================
            // STORE ALL FORM FIELDS IN R2
            // =================================================================
            const fields = {};
            const fieldNames = [
                'business_legal_name', 'dba_name', 'street_address', 'city_state_zip',
                'phone_number', 'business_email', 'tax_id', 'business_start_date',
                'amount_requested', 'monthly_revenue', 'purpose_of_funding',
                'owner1_name', 'owner1_address', 'owner1_city_state_zip', 'owner1_dob',
                'owner1_ssn', 'owner1_ownership', 'owner1_date', 'owner1_signature_data',
                'owner2_name', 'owner2_address', 'owner2_city_state_zip', 'owner2_dob',
                'owner2_ssn', 'owner2_ownership', 'owner2_date', 'owner2_signature_data',
                'agreement_checkbox'
            ];

            fieldNames.forEach(name => {
                const value = formData.get(name);
                if (value) fields[name] = value;
            });

            await env.GROVE_BUCKET.put(
                `${submissionId}/fields.json`,
                JSON.stringify(fields, null, 2),
                { httpMetadata: { contentType: 'application/json' } }
            );

            // =================================================================
            // SUBMIT TO JOTFORM API
            // =================================================================
            const jotformData = new FormData();

            const fieldMappings = {
                'business_legal_name':   'q3_businessLegal',
                'dba_name':              'q4_dbaName',
                'street_address':        'q5_streetAddress',
                'city_state_zip':        'q6_cityState',
                'phone_number':          'q7_mainPhone',
                'business_email':        'q8_email',
                'tax_id':                'q9_federalTax',
                'business_start_date':   'q10_businessStart',
                'amount_requested':      'q11_amountRequested',
                'monthly_revenue':       'q12_averageMonthly',
                'purpose_of_funding':    'q13_purposeOf',
                'owner1_name':           'q14_fullName14',
                'owner1_address':        'q15_streetAddress15',
                'owner1_city_state_zip': 'q16_cityState16',
                'owner1_dob':            'q17_dateOf',
                'owner1_ssn':            'q18_socialSecurity',
                'owner1_ownership':      'q19_ofOwnership',
                'owner1_date':           'q20_date',
                'owner1_signature_data': 'q21_signature',
                'owner2_name':           'q22_fullName22',
                'owner2_address':        'q23_streetAddress23',
                'owner2_city_state_zip': 'q24_cityState24',
                'owner2_dob':            'q25_dateOf25',
                'owner2_ssn':            'q26_socialSecurity26',
                'owner2_ownership':      'q27_ofOwnership27',
                'owner2_date':           'q28_date28',
                'owner2_signature_data': 'q29_signature29',
            };

            for (const [formField, jotformField] of Object.entries(fieldMappings)) {
                const value = formData.get(formField);
                if (value) jotformData.append(formField, value);
            }

            if (uploadedFiles.length > 0) {
                jotformData.append('uploaded_files', uploadedFiles.join(', '));
            }

            jotformData.append('submission_id', submissionId);
            jotformData.append('submitted_at', timestamp);

            const JOTFORM_API_KEY = env.JOTFORM_API_KEY;
            const JOTFORM_FORM_ID = '260295403951053';

            const jotformResponse = await fetch(
                `https://api.jotform.com/form/${JOTFORM_FORM_ID}/submissions?apiKey=${JOTFORM_API_KEY}`,
                { method: 'POST', body: jotformData }
            );

            const jotformResult = await jotformResponse.json();
            console.log('JotForm response:', JSON.stringify(jotformResult));

            // =================================================================
            // STORE METADATA IN R2
            // =================================================================
            const metadata = {
                submissionId,
                timestamp,
                businessName: formData.get('business_legal_name') || 'Unknown',
                email: formData.get('business_email') || 'Unknown',
                phone: formData.get('phone_number') || 'Unknown',
                amountRequested: formData.get('amount_requested') || 'Unknown',
                uploadedFiles,
                jotformSubmissionId: jotformResult?.content?.submissionID || null
            };

            await env.GROVE_BUCKET.put(
                `${submissionId}/metadata.json`,
                JSON.stringify(metadata, null, 2),
                { httpMetadata: { contentType: 'application/json' } }
            );

            // =================================================================
            // RETURN SUCCESS
            // =================================================================
            return new Response(JSON.stringify({
                success: true,
                message: 'Application submitted successfully',
                submissionId,
                filesUploaded: uploadedFiles.length
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({
                success: false,
                message: error.message || 'Internal server error'
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};