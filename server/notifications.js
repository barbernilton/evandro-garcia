import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { query } from './db.js';

let transporter = null;
const SENDER_EMAIL = process.env.SMTP_USER || 'barbearia.evandrogarcia2@gmail.com';
const SENDER_NAME = 'Evandro Garcia Barbearia';

function initTransporter() {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SENDER_EMAIL,
      pass: process.env.SMTP_PASS
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 10,
    rateDelta: 1000,
    rateLimit: 3
  });
  
  return transporter;
}

function getAntiSpamHeaders(toEmail) {
  return {
    'X-Mailer': 'EvandroGarcia-Booking/1.0',
    'X-Priority': '3',
    'Precedence': 'bulk',
    'List-Unsubscribe': `<mailto:${SENDER_EMAIL}?subject=unsubscribe>`,
    'Reply-To': SENDER_EMAIL,
    'Return-Path': SENDER_EMAIL
  };
}

function generateMessageId() {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  return `<${timestamp}.${random}@evandrogarcia.com>`;
}

function customerReminderText(booking) {
  return `Olá ${booking.customer_name},

Este é um lembrete do seu agendamento na Evandro Garcia Barbearia.

Detalhes do agendamento:
- Serviço: ${booking.service_name}
- Barbeiro: ${booking.barber_name || 'N/A'}
- Data: ${formatDatePT(booking.date)}
- Hora: ${booking.time}
- Valor: ${parseFloat(booking.total_price || 0).toFixed(2)} EUR

O seu agendamento é em 30 minutos.

Morada: Largo de Camões n3, 8000-140 Faro, Portugal

Obrigado,
Evandro Garcia Barbearia`;
}

function customerConfirmationText(booking) {
  return `Olá ${booking.customer_name},

O seu agendamento na Evandro Garcia Barbearia foi confirmado com sucesso.

Detalhes do agendamento:
- Serviço: ${booking.service_name}
- Barbeiro: ${booking.barber_name || 'N/A'}
- Data: ${formatDatePT(booking.date)}
- Hora: ${booking.time}
- Valor: ${parseFloat(booking.total_price || 0).toFixed(2)} EUR

Receberá um lembrete 30 minutos antes do seu agendamento.

Morada: Largo de Camões n3, 8000-140 Faro, Portugal

Obrigado,
Evandro Garcia Barbearia`;
}

function barberReminderText(booking) {
  return `Olá ${booking.barber_name || 'Barbeiro'},

Tem um cliente agendado em 30 minutos.

Detalhes:
- Cliente: ${booking.customer_name}
- Telefone: ${booking.customer_phone || 'N/A'}
- Serviço: ${booking.service_name}
- Hora: ${booking.time}

Evandro Garcia Barbearia`;
}

function barberConfirmationText(booking) {
  return `Olá ${booking.barber_name || 'Barbeiro'},

Tem um novo agendamento marcado.

Detalhes:
- Cliente: ${booking.customer_name}
- Telefone: ${booking.customer_phone || 'N/A'}
- Serviço: ${booking.service_name}
- Data: ${formatDatePT(booking.date)}
- Hora: ${booking.time}
- Valor: ${parseFloat(booking.total_price || 0).toFixed(2)} EUR

Evandro Garcia Barbearia`;
}

function buildEmailHtml(title, subtitle, greeting, message, details, footer) {
  return `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #d4a537; font-size: 22px; font-weight: bold;">EVANDRO GARCIA</h1>
              <p style="margin: 5px 0 0; color: #cccccc; font-size: 13px;">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; color: #333333;">
              <h2 style="color: #1a1a1a; margin-top: 0; font-size: 18px;">${title}</h2>
              <p style="margin: 0 0 10px; font-size: 15px;">${greeting}</p>
              <p style="margin: 0 0 20px; font-size: 15px;">${message}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9f9f9; border-left: 4px solid #d4a537; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    ${details.map(d => `<p style="margin: 4px 0; font-size: 14px; color: #333;"><strong>${d.label}:</strong> ${d.value}</p>`).join('')}
                  </td>
                </tr>
              </table>
              ${footer ? `<p style="margin: 20px 0 0; font-size: 13px; color: #888;">${footer}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="background-color: #1a1a1a; padding: 15px; text-align: center;">
              <p style="margin: 0; color: #888; font-size: 11px;">Evandro Garcia Barbearia - Largo de Camoes n3, 8000-140 Faro</p>
              <p style="margin: 4px 0 0; color: #666; font-size: 11px;">Tel: 289 042 683 | WhatsApp: 925 124 104</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendMail(to, subject, html, text) {
  const transport = initTransporter();
  const mailOptions = {
    from: { name: SENDER_NAME, address: SENDER_EMAIL },
    to: to,
    subject: subject,
    html: html,
    text: text,
    headers: getAntiSpamHeaders(to),
    messageId: generateMessageId(),
    encoding: 'utf-8'
  };
  await transport.sendMail(mailOptions);
}

async function sendBookingReminder(booking) {
  if (!process.env.SMTP_PASS) {
    console.log(`[Notificacao] SMTP nao configurado - lembrete para ${booking.customer_name} nao enviado`);
    return false;
  }
  
  try {
    const details = [
      { label: 'Servico', value: booking.service_name },
      { label: 'Barbeiro', value: booking.barber_name || 'N/A' },
      { label: 'Data', value: formatDatePT(booking.date) },
      { label: 'Hora', value: booking.time },
      { label: 'Valor', value: `${parseFloat(booking.total_price || 0).toFixed(2)} EUR` }
    ];

    if (booking.customer_email) {
      const html = buildEmailHtml(
        'Lembrete do seu agendamento',
        'Barbearia Premium em Faro',
        `Ola ${booking.customer_name},`,
        'Este e um lembrete de que o seu agendamento e em 30 minutos.',
        details,
        'Morada: Largo de Camoes n3, 8000-140 Faro, Portugal'
      );
      await sendMail(
        booking.customer_email,
        `Lembrete - Agendamento as ${booking.time} na Evandro Garcia Barbearia`,
        html,
        customerReminderText(booking)
      );
      console.log(`[Notificacao] Lembrete enviado para cliente ${booking.customer_email}`);
    }
    
    let barberEmail = null;
    if (booking.barber_id) {
      try {
        const barberResult = await query('SELECT email FROM barbers WHERE id = $1', [booking.barber_id]);
        if (barberResult.rows.length > 0 && barberResult.rows[0].email) {
          barberEmail = barberResult.rows[0].email;
        }
      } catch (e) {}
    }
    
    if (barberEmail) {
      const barberDetails = [
        { label: 'Cliente', value: booking.customer_name },
        { label: 'Telefone', value: booking.customer_phone || 'N/A' },
        { label: 'Servico', value: booking.service_name },
        { label: 'Hora', value: booking.time }
      ];
      const html = buildEmailHtml(
        'Cliente em 30 minutos',
        'Lembrete de Agendamento',
        `Ola ${booking.barber_name || 'Barbeiro'},`,
        'Tem um cliente agendado em 30 minutos.',
        barberDetails,
        null
      );
      await sendMail(
        barberEmail,
        `Lembrete - ${booking.customer_name} as ${booking.time}`,
        html,
        barberReminderText(booking)
      );
      console.log(`[Notificacao] Lembrete enviado para barbeiro ${barberEmail}`);
    }
    
    return true;
  } catch (err) {
    console.error(`[Notificacao] Erro ao enviar lembrete:`, err.message);
    return false;
  }
}

async function sendBookingConfirmation(booking) {
  if (!process.env.SMTP_PASS) return false;
  
  try {
    const details = [
      { label: 'Servico', value: booking.service_name },
      { label: 'Barbeiro', value: booking.barber_name || 'N/A' },
      { label: 'Data', value: formatDatePT(booking.date) },
      { label: 'Hora', value: booking.time },
      { label: 'Valor', value: `${parseFloat(booking.total_price || 0).toFixed(2)} EUR` }
    ];

    if (booking.customer_email) {
      const html = buildEmailHtml(
        'Agendamento Confirmado',
        'Barbearia Premium em Faro',
        `Ola ${booking.customer_name},`,
        'O seu agendamento foi confirmado com sucesso.',
        details,
        'Recebera um lembrete 30 minutos antes do seu agendamento.'
      );
      await sendMail(
        booking.customer_email,
        `Agendamento Confirmado - Evandro Garcia Barbearia`,
        html,
        customerConfirmationText(booking)
      );
      console.log(`[Notificacao] Confirmacao enviada para cliente ${booking.customer_email}`);
    }
    
    let barberEmail = booking.barber_email;
    if (!barberEmail && booking.barber_id) {
      try {
        const barberResult = await query('SELECT email FROM barbers WHERE id = $1', [booking.barber_id]);
        if (barberResult.rows.length > 0 && barberResult.rows[0].email) {
          barberEmail = barberResult.rows[0].email;
        }
      } catch (e) {}
    }
    
    if (barberEmail) {
      const barberDetails = [
        { label: 'Cliente', value: booking.customer_name },
        { label: 'Telefone', value: booking.customer_phone || 'N/A' },
        { label: 'Servico', value: booking.service_name },
        { label: 'Data', value: formatDatePT(booking.date) },
        { label: 'Hora', value: booking.time },
        { label: 'Valor', value: `${parseFloat(booking.total_price || 0).toFixed(2)} EUR` }
      ];
      const html = buildEmailHtml(
        'Novo Agendamento',
        'Novo Cliente Agendado',
        `Ola ${booking.barber_name || 'Barbeiro'},`,
        'Tem um novo agendamento marcado.',
        barberDetails,
        null
      );
      await sendMail(
        barberEmail,
        `Novo Agendamento - ${booking.customer_name} dia ${formatDatePT(booking.date)}`,
        html,
        barberConfirmationText(booking)
      );
      console.log(`[Notificacao] Confirmacao enviada para barbeiro ${barberEmail}`);
    }
    
    return true;
  } catch (err) {
    console.error(`[Notificacao] Erro ao enviar confirmacao:`, err.message);
    return false;
  }
}

function formatDatePT(dateStr) {
  const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

async function checkAndSendReminders() {
  try {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 30 * 60 * 1000);
    
    const dateStr = reminderTime.toISOString().split('T')[0];
    
    const timeWindowStart = `${reminderTime.getHours().toString().padStart(2, '0')}:${Math.floor(reminderTime.getMinutes() / 5) * 5}`.padEnd(5, '0');
    const endMinutes = Math.ceil(reminderTime.getMinutes() / 5) * 5;
    const endHour = endMinutes >= 60 ? reminderTime.getHours() + 1 : reminderTime.getHours();
    const timeWindowEnd = `${endHour.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    
    const result = await query(
      `SELECT * FROM bookings 
       WHERE date = $1 
       AND time >= $2 AND time < $3
       AND status != 'cancelado'
       AND (reminder_sent IS NULL OR reminder_sent = false)`,
      [dateStr, timeWindowStart, timeWindowEnd]
    );
    
    for (const booking of result.rows) {
      const sent = await sendBookingReminder(booking);
      if (sent) {
        await query('UPDATE bookings SET reminder_sent = true WHERE id = $1', [booking.id]);
      }
    }
  } catch (err) {
    console.error('[Notificacao] Erro ao verificar lembretes:', err.message);
  }
}

async function cleanupPastBookings() {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const result = await query(
      `DELETE FROM bookings 
       WHERE (date < $1) 
       OR (date = $1 AND time < $2)
       RETURNING id`,
      [dateStr, timeStr]
    );
    
    if (result.rows.length > 0) {
      console.log(`[Limpeza] ${result.rows.length} agendamento(s) passado(s) removido(s)`);
    }
  } catch (err) {
    console.error('[Limpeza] Erro ao limpar agendamentos:', err.message);
  }
}

export function startNotificationScheduler() {
  cron.schedule('*/5 * * * *', () => {
    checkAndSendReminders();
  });
  
  cron.schedule('*/10 * * * *', () => {
    cleanupPastBookings();
  });
  
  cleanupPastBookings();
  
  console.log('[Notificacao] Scheduler de lembretes e limpeza iniciado');
}

export { sendBookingConfirmation, sendBookingReminder, cleanupPastBookings };
