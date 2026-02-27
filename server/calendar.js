import { google } from 'googleapis';

// Carregar credenciais das variáveis de ambiente
function getCredentials() {
    const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (!credentialsJson) {
        console.error('❌ GOOGLE_CALENDAR_CREDENTIALS não está definido');
        throw new Error('GOOGLE_CALENDAR_CREDENTIALS não configurado');
    }
    
    try {
        const credentials = JSON.parse(credentialsJson);
        
        // Verificar campos obrigatórios
        if (!credentials.client_email) {
            throw new Error('client_email não encontrado nas credenciais');
        }
        if (!credentials.private_key) {
            throw new Error('private_key não encontrado nas credenciais');
        }
        
        // Corrigir o formato da private_key (substituir \\n por \n real)
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        
        console.log('✅ Credenciais carregadas - Email:', credentials.client_email);
        return credentials;
    } catch (error) {
        console.error('❌ Erro ao processar credenciais:', error.message);
        throw new Error('GOOGLE_CALENDAR_CREDENTIALS inválido: ' + error.message);
    }
}

// ID do calendário da variável de ambiente
function getCalendarId(storeId) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
        throw new Error('GOOGLE_CALENDAR_ID não configurado');
    }
    console.log('📅 Calendar ID:', calendarId);
    return calendarId;
}

const TIME_ZONE = 'Europe/Lisbon';

async function getCalendarAuth() {
    try {
        const credentials = getCredentials();
        
        console.log('🔐 Iniciando autenticação com:', credentials.client_email);
        
        const auth = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/calendar']
        });
        
        await auth.authorize();
        console.log('✅ Autenticação Google Calendar bem-sucedida');
        return auth;
    } catch (error) {
        console.error('❌ Erro na autenticação do Calendar:', error.message);
        console.error('Stack:', error.stack);
        throw new Error('Falha na autenticação com Google Calendar: ' + error.message);
    }
}

export async function createCalendarEvent(bookingData) {
    let auth;
    try {
        console.log('📅 Iniciando criação de evento no calendário...');
        auth = await getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });

        const { services, totalPrice, customerName, customerEmail, customerPhone, date, time, store, barberName, barberCalendarId, barberCalendarColor, durationMinutes } = bookingData;

        // Usa o calendário do barbeiro se disponível, senão usa o padrão da variável de ambiente
        let calendarId;
        if (barberCalendarId) {
            calendarId = barberCalendarId;
            console.log(`📅 Usando calendário do barbeiro ${barberName}: ${calendarId}`);
        } else {
            calendarId = getCalendarId(store);
            console.log(`📅 Usando calendário padrão: ${calendarId}`);
        }

        // Calcular horário de início e fim com base na duração do serviço
        const startDateTime = new Date(`${date}T${time}:00`);
        const endDateTime = new Date(startDateTime);
        const duration = durationMinutes || 60; // padrão 60 minutos
        endDateTime.setMinutes(endDateTime.getMinutes() + duration);
        
        console.log(`⏱️ Duração do evento: ${duration} minutos`);

        // Formatar lista de serviços
        let servicesList = '';
        if (Array.isArray(services)) {
            servicesList = services.map(s => `• ${s.name || s} - €${s.price || ''}`).join('\n');
        } else if (typeof services === 'string') {
            servicesList = `• ${services}`;
        }

        const description = `
CLIENTE:
Nome: ${customerName}
Email: ${customerEmail}
Telefone: ${customerPhone}

BARBEIRO:
${barberName || 'Não especificado'}

SERVIÇOS:
${servicesList}

TOTAL: €${totalPrice || '0.00'}

--- Agendado via EVANDRO GARCIA Website ---
        `.trim();

        // Nome do serviço para o título do evento (incluindo nome do barbeiro)
        const serviceName = Array.isArray(services) 
            ? services.map(s => s.name || s).join(' + ')
            : services;

        const event = {
            summary: `💈 ${barberName ? barberName + ' - ' : ''}${serviceName} - ${customerName}`,
            description: description,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: TIME_ZONE,
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: TIME_ZONE,
            },
            colorId: barberCalendarColor || '5',
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 60 },
                ],
            },
        };

        console.log(`📅 Criando evento para ${customerName} no calendário ${calendarId}`);

        const response = await calendar.events.insert({
            calendarId: calendarId,
            resource: event,
            sendUpdates: 'none',
        });

        console.log('✅ Evento criado com ID:', response.data.id);
        return response.data.id;

    } catch (error) {
        console.error('❌ Erro ao criar evento:', error.message);
        console.error('Detalhes:', JSON.stringify(error.response?.data || error, null, 2));
        
        if (error.code === 403) {
            throw new Error('Sem permissão para acessar o calendário. Verifique se o calendário foi compartilhado com a conta de serviço.');
        } else if (error.code === 404) {
            throw new Error('Calendário não encontrado. Verifique o ID do calendário.');
        }
        
        throw new Error(`Falha ao criar agendamento no calendário: ${error.message}`);
    }
}

// Exportar função para verificar configuração
export async function testCalendarConnection() {
    try {
        const auth = await getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        const calendarId = getCalendarId('1');
        
        const response = await calendar.calendars.get({
            calendarId: calendarId
        });
        
        console.log('✅ Conexão com calendário OK:', response.data.summary);
        return { success: true, calendarName: response.data.summary };
    } catch (error) {
        console.error('❌ Erro ao testar conexão:', error.message);
        return { success: false, error: error.message };
    }
}

// Buscar horários ocupados no calendário para uma data específica
// Retorna intervalos de tempo completos para verificar sobreposições
export async function getBusySlots(calendarId, date) {
    try {
        const auth = await getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        
        // Usar calendário padrão se não especificado
        const targetCalendarId = calendarId || getCalendarId('1');
        
        // Definir início e fim do dia
        const startOfDay = new Date(`${date}T00:00:00`);
        const endOfDay = new Date(`${date}T23:59:59`);
        
        console.log(`🔍 Buscando eventos ocupados em ${targetCalendarId} para ${date}`);
        
        const response = await calendar.events.list({
            calendarId: targetCalendarId,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: TIME_ZONE
        });
        
        // Retornar intervalos completos (start e end em minutos desde meia-noite)
        const busyIntervals = [];
        
        if (response.data.items) {
            response.data.items.forEach(event => {
                if (event.start && event.start.dateTime) {
                    const startTime = new Date(event.start.dateTime);
                    const endTime = new Date(event.end.dateTime);
                    
                    // Converter para minutos desde meia-noite para facilitar cálculos
                    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
                    
                    busyIntervals.push({
                        start: startMinutes,
                        end: endMinutes,
                        startTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
                        endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
                    });
                }
            });
        }
        
        console.log(`📅 Intervalos ocupados em ${date}:`, busyIntervals);
        return busyIntervals;
        
    } catch (error) {
        console.error('❌ Erro ao buscar horários ocupados:', error.message);
        return [];
    }
}

export async function fetchAllCalendarEvents(calendarId, timeMinDate, timeMaxDate) {
    try {
        const auth = await getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        
        const targetCalendarId = calendarId || getCalendarId('1');
        
        const params = {
            calendarId: targetCalendarId,
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: TIME_ZONE
        };
        
        if (timeMinDate) {
            params.timeMin = new Date(timeMinDate).toISOString();
        }
        if (timeMaxDate) {
            params.timeMax = new Date(timeMaxDate).toISOString();
        }
        
        const allEvents = [];
        let pageToken = null;
        
        do {
            if (pageToken) params.pageToken = pageToken;
            const response = await calendar.events.list(params);
            const events = response.data.items || [];
            allEvents.push(...events);
            pageToken = response.data.nextPageToken;
        } while (pageToken);
        
        return allEvents;
    } catch (error) {
        console.error('Erro ao buscar eventos do calendário:', error.message);
        throw error;
    }
}

export async function deleteCalendarEvent(calendarId, eventId) {
    try {
        console.log(`🗑️ Deletando evento ${eventId} do calendário ${calendarId}...`);
        const auth = await getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        
        await calendar.events.delete({
            calendarId: calendarId,
            eventId: eventId
        });
        
        console.log('✅ Evento deletado com sucesso do Google Calendar');
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao deletar evento do Calendar:', error.message);
        throw error;
    }
}

export async function clearAllCalendarEvents(calendarId) {
    try {
        console.log(`🧹 Limpando todos os eventos do calendário ${calendarId}...`);
        const auth = await getCalendarAuth();
        const calendar = google.calendar({ version: 'v3', auth });
        
        let deletedCount = 0;
        let pageToken = null;
        
        do {
            const response = await calendar.events.list({
                calendarId: calendarId,
                maxResults: 250,
                pageToken: pageToken
            });
            
            const events = response.data.items || [];
            
            for (const event of events) {
                try {
                    await calendar.events.delete({
                        calendarId: calendarId,
                        eventId: event.id
                    });
                    deletedCount++;
                } catch (delErr) {
                    console.log(`Erro ao deletar evento ${event.id}:`, delErr.message);
                }
            }
            
            pageToken = response.data.nextPageToken;
        } while (pageToken);
        
        console.log(`✅ ${deletedCount} eventos deletados do calendário ${calendarId}`);
        return deletedCount;
    } catch (error) {
        console.error('❌ Erro ao limpar calendário:', error.message);
        throw error;
    }
}
