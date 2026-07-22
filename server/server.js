const app = require('./app');
const { supabase } = require('./database/db');
const bcrypt = require('bcryptjs');

// Seed default admin if it doesn't exist in Supabase
async function seedDefaultAdmin() {
  try {
    const { data: admin } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'SAIRAM')
      .maybeSingle();

    if (!admin) {
      console.log('Seeding default admin account into Supabase...');
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'SAIRAM123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: 'SAIRAM',
          name: 'SAIRAM',
          login_id: 'SAIRAM',
          password: hashedPassword,
          role: 'staff',
          email: 'sairam@edupoll.com'
        }]);

      if (insertError) {
        console.error('Failed to seed SAIRAM admin:', insertError);
      } else {
        console.log(`Default admin SAIRAM seeded successfully.`);
      }
    } else {
      console.log('Admin SAIRAM is ready.');
    }
  } catch (err) {
    console.error('Error during admin setup:', err);
  }
}

// Migration to create classroom_staff table and migrate existing data
async function runClassroomStaffMigration() {
  try {
    console.log('Running classroom_staff table migration...');
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS public.classroom_staff (
        classroom_id TEXT REFERENCES public.classrooms(id) ON DELETE CASCADE,
        staff_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
        PRIMARY KEY (classroom_id, staff_id)
      );
    `;
    const { error: err1 } = await supabase.rpc('execute_sql', { sql_string: createTableSql });
    if (err1) {
      console.error('Failed to create classroom_staff table:', err1);
    } else {
      console.log('classroom_staff table verified/created.');
    }

    const disableRlsSql = `ALTER TABLE public.classroom_staff DISABLE ROW LEVEL SECURITY;`;
    await supabase.rpc('execute_sql', { sql_string: disableRlsSql });

    const migrateSql = `
      INSERT INTO public.classroom_staff (classroom_id, staff_id)
      SELECT id, staff_id FROM public.classrooms
      WHERE staff_id IS NOT NULL
      ON CONFLICT (classroom_id, staff_id) DO NOTHING;
    `;
    const { error: err3 } = await supabase.rpc('execute_sql', { sql_string: migrateSql });
    if (err3) {
      console.error('Failed to migrate existing classroom assignments:', err3);
    } else {
      console.log('Classroom assignments migration complete.');
    }
  } catch (err) {
    console.error('Classroom staff migration exception:', err);
  }
}

const { startCleanupScheduler } = require('./services/cleanupService');

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await runClassroomStaffMigration();
  await seedDefaultAdmin();
  startCleanupScheduler();
});
