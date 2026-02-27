const pg = require('pg');

async function explore() {
    const client = new pg.Client({
        connectionString: process.env.EXTERNAL_DATABASE_URL
    });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('TABLES:', JSON.stringify(res.rows.map(r => r.table_name)));
        
        for (const table of res.rows.map(r => r.table_name)) {
            const columns = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [table]);
            console.log(`COLUMNS_${table}:`, JSON.stringify(columns.rows));
            const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`COUNT_${table}:`, count.rows[0].count);
        }
        process.exit(0);
    } catch (e) {
        console.log('EXPLORE_ERR:', e.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}
explore();
