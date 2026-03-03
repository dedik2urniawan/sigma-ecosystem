const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function createStakeholder() {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            throw new Error("Missing Supabase credentials in .env.local");
        }

        const supabaseUrl = urlMatch[1].trim();
        const supabaseServiceKey = keyMatch[1].trim();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const email = 'stakeholder@dinkes.go.id';
        const password = 'malangdata01';

        console.log('1. Creating user in Supabase Auth...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });

        if (authError) {
            if (authError.message.includes('already')) {
                console.log('   User already exists in auth. Skipping creation.');
            } else {
                console.error('Error creating auth user:', authError);
                return;
            }
        } else {
            console.log('   User created successfully in Auth.');
        }

        console.log('2. Fetching user ID...');
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const user = users.find(u => u.email === email);
        if (!user) {
            console.error('   Could not find user ID.');
            return;
        }

        console.log(`   User found. ID: ${user.id}`);
        console.log('3. Upserting into app_users table...');

        const { data: appData, error: appError } = await supabase
            .from('app_users')
            .upsert({
                id: user.id,
                email: email,
                role: 'stakeholder',
                nama_lengkap: 'Stakeholder Dinkes'
            });

        if (appError) {
            console.error('   Error inserting into app_users:', appError);
        } else {
            console.log('   Successfully added stakeholder to app_users!');
            console.log('🚀 Role Setup Completed!');
        }
    } catch (e) {
        console.error('Script failed:', e);
    }
}

createStakeholder();
