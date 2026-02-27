const { query } = require('./server/db.js');
const { google } = require('googleapis');

async function sync() {
    try {
        const creds = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
        const auth = new google.auth.JWT({
            email: creds.client_email,
            key: creds.private_key.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/calendar.readonly']
        });

        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = process.env.GOOGLE_CALENDAR_ID || 'barbearia.evandrogarcia2@gmail.com';

        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.data.items || [];
        let imported = 0;

        for (const event of events) {
            if (!(event.summary || '').includes('💈')) continue;
            
            const parts = event.summary.replace('💈 ', '').split(' - ');
            const barber = parts[0] || '';
            const service = parts[1] || '';
            const customer = parts[2] || 'Importado';
            
            const start = event.start.dateTime || event.start.date;
            const dateStr = start.split('T')[0];
            const timeStr = (start.includes('T') ? start.split('T')[1].substring(0, 5) : '00:00');

            const check = await query('SELECT id FROM bookings WHERE google_event_id = ', [event.id]);
            if (check.rows.length === 0) {
                await query(
                    'INSERT INTO bookings (customer_name, service_name, barber_name, date, time, status, google_event_id) VALUES (, , , , , , )',
                    [customer, service, barber, dateStr, timeStr, 'confirmado', event.id]
                );
                imported++;
            }
        }
        console.log('SYNC_OK:' + imported);
        process.exit(0);
    } catch (e) {
        console.log('SYNC_ERR:' + e.message);
        process.exit(1);
    }
}
sync();
