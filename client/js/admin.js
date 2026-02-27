// Setup AJAX to include Authorization header with Bearer token
$.ajaxSetup({
    beforeSend: function(xhr) {
        const token = localStorage.getItem('authToken');
        if (token) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        }
    }
});

$(document).ready(function() {
    checkAuth();
    initMobileMenu();

    $('.sidebar-menu li').click(function() {
        $('.sidebar-menu li').removeClass('active');
        $(this).addClass('active');
        // Close mobile menu when tab selected
        closeMobileMenu();
        
        const tab = $(this).data('tab');
        $('.tab-content').removeClass('active');
        $(`#${tab}`).addClass('active');

        if (tab === 'dashboard') loadDashboard();
        if (tab === 'expenses') loadExpenses();
        if (tab === 'services') loadServices();
        if (tab === 'barbers') loadBarbers();
        if (tab === 'bookings') loadBookings();
        if (tab === 'calendar-view') loadCalendarView();
        if (tab === 'recurring') loadRecurring();
        if (tab === 'customers') loadCustomers();
        if (tab === 'subscriptions') loadSubscriptions();
        if (tab === 'gallery') loadGallery();
        if (tab === 'radio') loadRadio();
    });

    $('#login-form').submit(function(e) {
        e.preventDefault();
        const password = $('#admin-password').val();
        const email = 'barbearia.evandrogarcia2@gmail.com';
        
        $.ajax({
            url: '/api/auth/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            success: function(data) {
                if (data.user && data.user.email === 'barbearia.evandrogarcia2@gmail.com') {
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    $('#login-overlay').hide();
                    $('#admin-content').show();
                    loadDashboard();
                } else {
                    $('#login-error').text('Acesso negado. Apenas o administrador pode acessar.').show();
                }
            },
            error: function(xhr) {
                $('#login-error').text(xhr.responseJSON?.error || 'Senha incorreta').show();
            }
        });
    });
    
    $('#logout-btn').click(function() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    $('#add-expense-form').submit(function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        $.ajax({
            url: '/api/expenses',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: () => {
                alert('Gasto adicionado!');
                $('#add-expense-form')[0].reset();
                $('#expense-form').slideUp();
                loadExpenses();
                loadDashboard();
            },
            error: (xhr) => {
                if (xhr.status === 401) {
                    alert('Sessão expirada. Faça login novamente.');
                    window.location.href = '/api/login';
                } else {
                    alert('Erro ao adicionar gasto');
                }
            }
        });
    });

    $('#add-service-form').submit(function(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        $.ajax({
            url: '/api/services',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: () => {
                alert('Serviço adicionado!');
                $('#add-service-form')[0].reset();
                $('#service-form').slideUp();
                loadServices();
            },
            error: (xhr) => {
                if (xhr.status === 401) {
                    alert('Sessão expirada. Faça login novamente.');
                    window.location.href = '/api/login';
                } else {
                    alert('Erro ao adicionar serviço');
                }
            }
        });
    });

    $('#add-barber-form').submit(function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const photoFile = $('#add-barber-photo')[0].files[0];
        
        if (photoFile) {
            $.ajax({
                url: '/api/barbers/upload',
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: () => {
                    alert('Barbeiro adicionado!');
                    $('#add-barber-form')[0].reset();
                    $('#add-barber-file-name').text('');
                    $('#barber-form').slideUp();
                    loadBarbers();
                },
                error: (xhr) => {
                    if (xhr.status === 401) {
                        alert('Sessão expirada. Faça login novamente.');
                        window.location.href = '/api/login';
                    } else {
                        alert('Erro ao adicionar barbeiro');
                    }
                }
            });
        } else {
            const data = Object.fromEntries(formData);
            $.ajax({
                url: '/api/barbers',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: () => {
                    alert('Barbeiro adicionado!');
                    $('#add-barber-form')[0].reset();
                    $('#barber-form').slideUp();
                    loadBarbers();
                },
                error: (xhr) => {
                    if (xhr.status === 401) {
                        alert('Sessão expirada. Faça login novamente.');
                        window.location.href = '/api/login';
                    } else {
                        alert('Erro ao adicionar barbeiro');
                    }
                }
            });
        }
    });

    $('#add-barber-photo').change(function() {
        const fileName = this.files[0] ? this.files[0].name : '';
        $('#add-barber-file-name').text(fileName);
    });

    $('#gallery-file').change(function() {
        const fileName = this.files[0] ? this.files[0].name : '';
        $('#gallery-file-name').text(fileName);
    });

    $('#edit-barber-photo').change(function() {
        const fileName = this.files[0] ? this.files[0].name : '';
        $('#edit-barber-file-name').text(fileName);
        if (this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#edit-barber-preview').attr('src', e.target.result).show();
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    $('#generate-pdf-btn').click(generatePDF);
});

// ========== MOBILE MENU FUNCTIONS ==========
function initMobileMenu() {
    $('#mobile-menu-toggle').click(function() {
        $('#admin-sidebar').addClass('open');
        $('#sidebar-overlay').addClass('show');
    });
    
    $('#sidebar-close, #sidebar-overlay').click(function() {
        closeMobileMenu();
    });
}

function closeMobileMenu() {
    $('#admin-sidebar').removeClass('open');
    $('#sidebar-overlay').removeClass('show');
}

function checkAuth() {
    const savedToken = localStorage.getItem('authToken');
    
    if (savedToken) {
        // Validate token with server
        $.ajax({
            url: '/api/auth/me',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + savedToken
            },
            success: function(data) {
                if (data.user && data.user.isAdmin) {
                    // User is authenticated and is admin
                    localStorage.setItem('user', JSON.stringify(data.user));
                    $('#admin-content').show();
                    $('#login-overlay').hide();
                    loadDashboard();
                } else if (data.user && !data.user.isAdmin) {
                    // User is logged in but not admin
                    $('#login-overlay').show();
                    $('.login-box h2').text('Acesso Negado');
                    $('.login-box p').text('Apenas o administrador pode acessar este painel.');
                    $('#login-form').hide();
                } else {
                    // Invalid response
                    showLoginForm();
                }
            },
            error: function() {
                // Token invalid or expired - clear and show login
                localStorage.removeItem('user');
                localStorage.removeItem('authToken');
                showLoginForm();
            }
        });
    } else {
        // No token - show login form
        showLoginForm();
    }
}

function showLoginForm() {
    $('#login-overlay').show();
    $('.login-box h2').text('Acesso Restrito');
    $('.login-box p').text('Digite a senha de administrador para acessar.');
    $('#login-form').show();
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function loadDashboard() {
    $.get('/api/dashboard')
        .done(function(data) {
            $('#total-income').text(formatCurrency(data.income));
            $('#total-expenses').text(formatCurrency(data.expenseTotal));
            $('#net-profit').text(formatCurrency(data.profit));
            $('#total-bookings-count').text(data.bookingCount || 0);
            
            renderChart(data.monthlyData || []);
        })
        .fail(function(xhr) {
            if (xhr.status === 401) {
                checkAuth();
            }
        });
}

function renderChart(monthlyData) {
    const ctx = document.getElementById('annual-chart').getContext('2d');
    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const profitData = monthlyData.length === 12 ? monthlyData : Array(12).fill(0);

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lucro Líquido (€)',
                data: profitData,
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function loadExpenses() {
    $.get('/api/expenses')
        .done(function(data) {
            const tbody = $('#expenses-table-body');
            tbody.empty();
            if (data.length === 0) {
                tbody.append('<tr><td colspan="5" style="text-align:center;">Nenhum gasto registrado</td></tr>');
                return;
            }
            data.forEach(expense => {
                const dateStr = expense.date ? expense.date.split('T')[0] : '';
                tbody.append(`
                    <tr>
                        <td>${new Date(expense.date).toLocaleDateString('pt-PT')}</td>
                        <td>${expense.description}</td>
                        <td><span class="badge">${expense.category}</span></td>
                        <td>${formatCurrency(expense.value)}</td>
                        <td>
                            <button class="edit-btn" onclick="editExpense(${expense.id}, '${expense.description}', ${expense.value}, '${dateStr}', '${expense.category}')"><i class="fas fa-edit"></i></button>
                            <button class="delete-btn" onclick="deleteExpense(${expense.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `);
            });
        })
        .fail(function(xhr) {
            if (xhr.status === 401) checkAuth();
        });
}

function deleteExpense(id) {
    if(confirm('Tem certeza que deseja excluir este gasto?')) {
        $.ajax({
            url: `/api/expenses/${id}`,
            method: 'DELETE',
            success: () => {
                loadExpenses();
                loadDashboard();
            }
        });
    }
}

function loadServices() {
    $.get('/api/services')
        .done(function(data) {
            const tbody = $('#services-table-body');
            tbody.empty();
            if (data.length === 0) {
                tbody.append('<tr><td colspan="4" style="text-align:center;">Nenhum serviço cadastrado</td></tr>');
                return;
            }
            data.forEach(service => {
                tbody.append(`
                    <tr>
                        <td>${service.name}</td>
                        <td>${formatCurrency(service.price)}</td>
                        <td>${service.duration || '-'}</td>
                        <td>
                            <button class="edit-btn" onclick="editService(${service.id}, '${service.name}', ${service.price}, '${service.duration || ''}')"><i class="fas fa-edit"></i></button>
                            <button class="delete-btn" onclick="deleteService(${service.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `);
            });
        })
        .fail(function(xhr) {
            if (xhr.status === 401) checkAuth();
        });
}

function deleteService(id) {
    if(confirm('Tem certeza que deseja excluir este serviço?')) {
        $.ajax({
            url: `/api/services/${id}`,
            method: 'DELETE',
            success: loadServices
        });
    }
}

function loadBarbers() {
    // Carregar barbeiros e estatísticas em paralelo
    Promise.all([
        $.get('/api/barbers'),
        $.get('/api/barbers/stats')
    ]).then(function([barbers, stats]) {
        const tbody = $('#barbers-table-body');
        tbody.empty();
        if (barbers.length === 0) {
            tbody.append('<tr><td colspan="5" style="text-align:center;">Nenhum barbeiro cadastrado</td></tr>');
            return;
        }
        
        // Criar mapa de estatísticas por ID
        const statsMap = {};
        stats.forEach(s => { statsMap[s.id] = parseInt(s.clients_count) || 0; });
        
        barbers.forEach(barber => {
            const rawPhoto = barber.photo || 'assets/barbers/default.jpg';
            const photoUrl = rawPhoto.startsWith('/') ? rawPhoto : '/' + rawPhoto;
            const clientsCount = statsMap[barber.id] || 0;
            const calendarId = (barber.calendar_id || '').replace(/'/g, "\\'");
            const calendarColor = barber.calendar_color || '5';
            tbody.append(`
                <tr>
                    <td><img src="${photoUrl}" class="barber-thumb" alt="${barber.name}"> ${barber.name}</td>
                    <td>${barber.specialty || '-'}</td>
                    <td><span class="clients-badge">${clientsCount}</span></td>
                    <td>Loja ${barber.store_id || 1}</td>
                    <td>
                        <button class="edit-btn" onclick="editBarber(${barber.id}, '${barber.name.replace(/'/g, "\\'")}', '${(barber.specialty || '').replace(/'/g, "\\'")}', '${(barber.experience || '').replace(/'/g, "\\'")}', '${photoUrl}', ${barber.store_id || 1}, '${calendarId}', '${calendarColor}', '${(barber.email || '').replace(/'/g, "\\'")}')" ><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" onclick="deleteBarber(${barber.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `);
        });
    }).catch(function(xhr) {
        if (xhr.status === 401) checkAuth();
    });
}

function deleteBarber(id) {
    if(confirm('Tem certeza que deseja excluir este barbeiro?')) {
        $.ajax({
            url: `/api/barbers/${id}`,
            method: 'DELETE',
            success: loadBarbers
        });
    }
}

function loadBookings() {
    $.get('/api/bookings')
        .done(function(data) {
            allBookingsCache = data;
            const tbody = $('#bookings-table-body');
            tbody.empty();
            if (data.length === 0) {
                tbody.append('<tr><td colspan="7" style="text-align:center;">Nenhum agendamento registrado</td></tr>');
                return;
            }
            data.forEach(booking => {
                const date = booking.date ? new Date(booking.date).toLocaleDateString('pt-PT') : '-';
                const statusClass = booking.status === 'confirmado' ? 'status-pago' : 
                                   booking.status === 'cancelado' ? 'status-pendente' : '';
                tbody.append(`
                    <tr>
                        <td>${date} ${booking.time || ''}</td>
                        <td>${booking.customer_name || '-'}</td>
                        <td>${booking.service_name || '-'}</td>
                        <td>${booking.barber_name || '-'}</td>
                        <td>${formatCurrency(booking.total_price)}</td>
                        <td><span class="status-btn ${statusClass}">${booking.status}</span></td>
                        <td>
                            <button class="delete-btn" onclick="deleteBooking(${booking.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `);
            });
        })
        .fail(function(xhr) {
            if (xhr.status === 401) checkAuth();
        });
}

function deleteBooking(id) {
    let booking = calendarBookings ? calendarBookings.find(b => b.id === id) : null;
    if (!booking) booking = allBookingsCache ? allBookingsCache.find(b => b.id === id) : null;
    
    if (booking && booking.is_recurring && booking.recurrence_id) {
        const choice = confirm('Este agendamento faz parte de uma série recorrente.\n\nClique OK para apagar TODOS os agendamentos da série.\nClique Cancelar para apagar apenas este.');
        
        if (choice) {
            if (!confirm('Tem certeza que deseja apagar TODOS os agendamentos desta série?')) return;
            $.ajax({
                url: `/api/recurring-bookings/${booking.recurrence_id}/delete-all`,
                method: 'DELETE',
                success: function() {
                    loadBookings();
                    loadDashboard();
                    loadCalendarView();
                    loadRecurringBookings();
                },
                error: function(xhr) {
                    alert('Erro ao apagar série recorrente');
                    if (xhr.status === 401) checkAuth();
                }
            });
        } else {
            $.ajax({
                url: `/api/bookings/${id}`,
                method: 'DELETE',
                success: function() {
                    loadBookings();
                    loadDashboard();
                    loadCalendarView();
                },
                error: function(xhr) {
                    alert('Erro ao apagar agendamento');
                    if (xhr.status === 401) checkAuth();
                }
            });
        }
    } else {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
        $.ajax({
            url: `/api/bookings/${id}`,
            method: 'DELETE',
            success: function() {
                loadBookings();
                loadDashboard();
                loadCalendarView();
            },
            error: function(xhr) {
                alert('Erro ao apagar agendamento');
                if (xhr.status === 401) checkAuth();
            }
        });
    }
}

function showLoading(message) {
    $('#loading-message').text(message || 'A processar...');
    $('#loading-overlay').fadeIn(200);
}

function hideLoading() {
    $('#loading-overlay').fadeOut(200);
}

function deleteAllBookings() {
    if(!confirm('ATENÇÃO: Isso vai apagar TODOS os agendamentos! Tem certeza?')) return;
    if(!confirm('Esta ação é irreversível. Confirma?')) return;
    
    showLoading('A apagar agendamentos do sistema...');
    
    $.ajax({
        url: '/api/bookings/delete-all',
        method: 'DELETE',
        success: function(response) {
            hideLoading();
            loadBookings();
            loadDashboard();
        },
        error: function(xhr) {
            hideLoading();
            alert('Erro ao apagar: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
        }
    });
}

function openCreateBookingModal() {
    const serviceSelect = $('#booking-service-select');
    const barberSelect = $('#booking-barber-select');
    
    serviceSelect.html('<option value="">Selecione um serviço</option>');
    barberSelect.html('<option value="">Selecione um barbeiro</option>');
    
    $.get('/api/services').done(function(services) {
        services.forEach(s => {
            serviceSelect.append(`<option value="${s.name}" data-price="${s.price}">${s.name} - €${parseFloat(s.price).toFixed(2)}</option>`);
        });
    });
    
    $.get('/api/barbers').done(function(barbers) {
        barbers.forEach(b => {
            barberSelect.append(`<option value="${b.name}">${b.name}</option>`);
        });
    });
    
    $('#booking-service-select').off('change').on('change', function() {
        const price = $(this).find(':selected').data('price');
        if (price) {
            $('input[name="totalPrice"]', '#create-booking-form').val(parseFloat(price).toFixed(2));
        }
    });
    
    const today = new Date().toISOString().split('T')[0];
    $('input[name="date"]', '#create-booking-form').val(today);
    
    $('#create-booking-form')[0].reset();
    $('input[name="date"]', '#create-booking-form').val(today);
    $('#create-booking-modal').fadeIn(200);
}

$('#create-booking-form').on('submit', function(e) {
    e.preventDefault();
    const form = $(this);
    const data = {
        customerName: form.find('[name="customerName"]').val(),
        customerPhone: form.find('[name="customerPhone"]').val(),
        customerEmail: form.find('[name="customerEmail"]').val(),
        serviceName: form.find('[name="serviceName"]').val(),
        barberName: form.find('[name="barberName"]').val(),
        date: form.find('[name="date"]').val(),
        time: form.find('[name="time"]').val(),
        totalPrice: parseFloat(form.find('[name="totalPrice"]').val()) || 0,
        services: [{ name: form.find('[name="serviceName"]').val(), price: parseFloat(form.find('[name="totalPrice"]').val()) || 0 }]
    };
    
    $.ajax({
        url: '/api/bookings',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(result) {
            closeModal('create-booking-modal');
            loadBookings();
            loadDashboard();
            alert('Agendamento criado com sucesso!');
        },
        error: function(xhr) {
            alert('Erro ao criar agendamento: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
        }
    });
});

function loadSubscriptions() {
    $.get('/api/subscriptions')
        .done(function(data) {
            const tbody = $('#subscriptions-table-body');
            tbody.empty();
            if (data.length === 0) {
                tbody.append('<tr><td colspan="7" style="text-align:center;">Nenhuma assinatura registrada</td></tr>');
                return;
            }
            data.forEach(sub => {
                const statusClass = `status-${sub.status}`;
                tbody.append(`
                    <tr>
                        <td>${sub.customer_name}</td>
                        <td>${sub.customer_phone || '-'}</td>
                        <td>${sub.customer_email}</td>
                        <td>${sub.plan_name || 'Plano Mensal'}</td>
                        <td>${formatCurrency(sub.plan_price || 0)}</td>
                        <td>
                            <select class="status-select ${statusClass}" onchange="updateSubscriptionStatus(${sub.id}, this.value)">
                                <option value="pendente" ${sub.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                                <option value="pago" ${sub.status === 'pago' ? 'selected' : ''}>Pago</option>
                                <option value="cancelado" ${sub.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                        </td>
                        <td>
                            <button class="delete-btn" onclick="deleteSubscription(${sub.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `);
            });
        })
        .fail(function(xhr) {
            if (xhr.status === 401) checkAuth();
        });
}

function updateSubscriptionStatus(id, newStatus) {
    let nextDueDate = null;
    if (newStatus === 'pago') {
        const today = new Date();
        nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    }
    
    $.ajax({
        url: `/api/subscriptions/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ 
            status: newStatus, 
            paymentDate: newStatus === 'pago' ? new Date() : null,
            nextDueDate: nextDueDate 
        }),
        success: function() {
            loadSubscriptions();
            loadDashboard();
        }
    });
}

function deleteSubscription(id) {
    if(confirm('Tem certeza que deseja excluir esta assinatura?')) {
        $.ajax({
            url: `/api/subscriptions/${id}`,
            method: 'DELETE',
            success: loadSubscriptions
        });
    }
}

function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente';
    $.ajax({
        url: `/api/subscriptions/${id}`,
        method: 'PATCH',
        contentType: 'application/json',
        data: JSON.stringify({ status: newStatus }),
        success: loadSubscriptions
    });
}

function generatePDF() {
    // Buscar estatísticas dos barbeiros antes de gerar o PDF
    $.get('/api/barbers/stats').done(function(barberStats) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const now = new Date();
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        doc.setFontSize(22);
        doc.setTextColor(0, 0, 0);
        doc.text('EVANDRO GARCIA', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text('Relatório Mensal', 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`${monthNames[now.getMonth()]} de ${now.getFullYear()}`, 105, 38, { align: 'center' });
        
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);
        
        const income = $('#total-income').text();
        const expenses = $('#total-expenses').text();
        const profit = $('#net-profit').text();
        const bookings = $('#total-bookings-count').text();

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumo Financeiro', 20, 60);
        
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        
        doc.text('Faturamento Bruto:', 20, 75);
        doc.setTextColor(0, 150, 0);
        doc.text(income, 80, 75);
        
        doc.setTextColor(50, 50, 50);
        doc.text('Total de Gastos:', 20, 85);
        doc.setTextColor(200, 0, 0);
        doc.text(expenses, 80, 85);
        
        doc.setTextColor(50, 50, 50);
        doc.text('Lucro Líquido:', 20, 95);
        doc.setTextColor(212, 175, 55);
        doc.text(profit, 80, 95);
        
        doc.setTextColor(50, 50, 50);
        doc.text('Agendamentos:', 20, 105);
        doc.setTextColor(0, 100, 200);
        doc.text(bookings, 80, 105);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 115, 190, 115);
        
        // Seção de desempenho dos barbeiros
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Desempenho dos Barbeiros', 20, 130);
        
        doc.setFontSize(12);
        let yPos = 145;
        
        if (barberStats && barberStats.length > 0) {
            barberStats.forEach(barber => {
                doc.setTextColor(50, 50, 50);
                doc.text(barber.name + ':', 20, yPos);
                doc.setTextColor(212, 175, 55);
                doc.text(barber.clients_count + ' clientes atendidos', 80, yPos);
                yPos += 10;
            });
        } else {
            doc.setTextColor(100, 100, 100);
            doc.text('Nenhum atendimento registrado este mês', 20, yPos);
        }
        
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Gerado em: ${now.toLocaleString('pt-PT')}`, 20, 280);
        
        doc.save(`relatorio-${monthNames[now.getMonth()].toLowerCase()}-${now.getFullYear()}.pdf`);
    }).fail(function() {
        alert('Erro ao carregar estatísticas dos barbeiros');
    });
}

// ========== MODAL FUNCTIONS ==========
function openModal(modalId) {
    $(`#${modalId}`).fadeIn(200);
}

function closeModal(modalId) {
    $(`#${modalId}`).fadeOut(200);
}

$('.modal-overlay').click(function(e) {
    if (e.target === this) {
        $(this).fadeOut(200);
    }
});

// ========== EDIT FUNCTIONS ==========
function editExpense(id, description, value, date, category) {
    const form = $('#edit-expense-form');
    form.find('[name="id"]').val(id);
    form.find('[name="description"]').val(description);
    form.find('[name="value"]').val(value);
    form.find('[name="date"]').val(date);
    form.find('[name="category"]').val(category);
    openModal('edit-expense-modal');
}

$('#edit-expense-form').submit(function(e) {
    e.preventDefault();
    const id = $(this).find('[name="id"]').val();
    const data = {
        description: $(this).find('[name="description"]').val(),
        value: parseFloat($(this).find('[name="value"]').val()),
        date: $(this).find('[name="date"]').val(),
        category: $(this).find('[name="category"]').val()
    };
    
    $.ajax({
        url: `/api/expenses/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            closeModal('edit-expense-modal');
            loadExpenses();
            loadDashboard();
        }
    });
});

function editService(id, name, price, duration) {
    const form = $('#edit-service-form');
    form.find('[name="id"]').val(id);
    form.find('[name="name"]').val(name);
    form.find('[name="price"]').val(price);
    form.find('[name="duration"]').val(duration);
    openModal('edit-service-modal');
}

$('#edit-service-form').submit(function(e) {
    e.preventDefault();
    const id = $(this).find('[name="id"]').val();
    const data = {
        name: $(this).find('[name="name"]').val(),
        price: parseFloat($(this).find('[name="price"]').val()),
        duration: $(this).find('[name="duration"]').val()
    };
    
    $.ajax({
        url: `/api/services/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            closeModal('edit-service-modal');
            loadServices();
        }
    });
});

function editBarber(id, name, specialty, experience, photo, storeId, calendarId, calendarColor, email) {
    const form = $('#edit-barber-form');
    form.find('[name="id"]').val(id);
    form.find('[name="name"]').val(name);
    form.find('[name="email"]').val(email || '');
    form.find('[name="specialty"]').val(specialty);
    form.find('[name="experience"]').val(experience);
    form.find('[name="existingPhoto"]').val(photo);
    form.find('[name="storeId"]').val(storeId);
    form.find('[name="calendarId"]').val(calendarId || '');
    form.find('[name="calendarColor"]').val(calendarColor || '5');
    
    const previewSrc = photo && !photo.startsWith('/') ? '/' + photo : photo;
    $('#edit-barber-preview').attr('src', previewSrc).show();
    $('#edit-barber-file-name').text('');
    $('#edit-barber-photo').val('');
    
    openModal('edit-barber-modal');
}

$('#edit-barber-form').submit(function(e) {
    e.preventDefault();
    const id = $(this).find('[name="id"]').val();
    const formData = new FormData(this);
    const photoFile = $('#edit-barber-photo')[0].files[0];
    
    $.ajax({
        url: `/api/barbers/${id}/upload`,
        method: 'PUT',
        data: formData,
        processData: false,
        contentType: false,
        success: function() {
            closeModal('edit-barber-modal');
            loadBarbers();
        },
        error: function(xhr) {
            alert('Erro ao atualizar barbeiro');
        }
    });
});

// ========== GALLERY FUNCTIONS ==========
function loadGallery() {
    $.get('/api/carousel')
        .done(function(data) {
            const grid = $('#gallery-grid');
            grid.empty();
            if (data.length === 0) {
                grid.html('<p style="text-align:center; padding:20px;">Nenhuma mídia na galeria</p>');
                return;
            }
            data.forEach(item => {
                const isVideo = item.type === 'video';
                grid.append(`
                    <div class="gallery-admin-item">
                        ${isVideo ? 
                            `<video src="${item.url}" class="gallery-admin-media"></video>` :
                            `<img src="${item.url}" class="gallery-admin-media" alt="${item.title || ''}">`
                        }
                        <div class="gallery-admin-info">
                            <span class="gallery-type-badge">${isVideo ? 'Vídeo' : 'Imagem'}</span>
                            <p>${item.title || 'Sem título'}</p>
                        </div>
                        <button class="delete-btn gallery-delete" onclick="deleteGalleryItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `);
            });
        })
        .fail(function(xhr) {
            if (xhr.status === 401) checkAuth();
        });
}

function deleteGalleryItem(id) {
    if(confirm('Tem certeza que deseja excluir esta mídia?')) {
        $.ajax({
            url: `/api/carousel/${id}`,
            method: 'DELETE',
            success: loadGallery
        });
    }
}

// Gallery form submission
$(document).ready(function() {
    $('#add-gallery-form').submit(function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        $.ajax({
            url: '/api/carousel/upload',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function() {
                $('#add-gallery-form')[0].reset();
                $('#gallery-file-name').text('');
                $('#gallery-form').slideUp();
                loadGallery();
            },
            error: function(xhr) {
                alert('Erro ao adicionar mídia: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
            }
        });
    });

    $('#radio-file').change(function() {
        const fileName = this.files[0] ? this.files[0].name : '';
        $('#radio-file-name').text(fileName);
    });

    $('#add-radio-form').submit(function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        $.ajax({
            url: '/api/radio/upload',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function() {
                $('#add-radio-form')[0].reset();
                $('#radio-file-name').text('');
                $('#radio-form').slideUp();
                loadRadio();
            },
            error: function(xhr) {
                alert('Erro ao adicionar música: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
            }
        });
    });
});

function loadRadio() {
    $.get('/api/radio/all')
        .done(function(data) {
            const tbody = $('#radio-table-body');
            tbody.empty();
            if (data.length === 0) {
                tbody.append('<tr><td colspan="4" style="text-align:center;">Nenhuma música cadastrada</td></tr>');
                return;
            }
            data.forEach(track => {
                const statusClass = track.is_active ? 'status-pago' : 'status-cancelado';
                const statusText = track.is_active ? 'Ativa' : 'Inativa';
                tbody.append(`
                    <tr>
                        <td>
                            <i class="fas fa-music" style="color: var(--secondary-gold); margin-right: 8px;"></i>
                            ${track.title}
                        </td>
                        <td>${track.artist || '-'}</td>
                        <td>
                            <button class="status-btn ${statusClass}" onclick="toggleRadioStatus(${track.id}, ${track.is_active})">${statusText}</button>
                        </td>
                        <td>
                            <button class="edit-btn" onclick="editRadioTrack(${track.id}, '${track.title.replace(/'/g, "\\'")}', '${(track.artist || '').replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i></button>
                            <button class="delete-btn" onclick="deleteRadioTrack(${track.id})"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `);
            });
        })
        .fail(function(xhr) {
            if (xhr.status === 401) checkAuth();
        });
}

function toggleRadioStatus(id, currentStatus) {
    $.ajax({
        url: `/api/radio/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ is_active: !currentStatus }),
        success: loadRadio
    });
}

function deleteRadioTrack(id) {
    if(confirm('Tem certeza que deseja excluir esta música?')) {
        $.ajax({
            url: `/api/radio/${id}`,
            method: 'DELETE',
            success: loadRadio
        });
    }
}

function editRadioTrack(id, title, artist) {
    const form = $('#edit-radio-form');
    form.find('[name="id"]').val(id);
    form.find('[name="title"]').val(title);
    form.find('[name="artist"]').val(artist);
    openModal('edit-radio-modal');
}

$('#edit-radio-form').submit(function(e) {
    e.preventDefault();
    const id = $(this).find('[name="id"]').val();
    const data = {
        title: $(this).find('[name="title"]').val(),
        artist: $(this).find('[name="artist"]').val()
    };
    
    $.ajax({
        url: `/api/radio/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            closeModal('edit-radio-modal');
            loadRadio();
        }
    });
});

// ========== CUSTOMERS MANAGEMENT ==========
let allCustomers = [];
let foundDuplicateCustomer = null;

function loadCustomers() {
    $.get('/api/customers')
        .done(function(customers) {
            allCustomers = customers;
            const tbody = $('#customers-table-body');
            tbody.empty();
            
            if (customers.length === 0) {
                tbody.append('<tr><td colspan="6" style="text-align:center;">Nenhum cliente cadastrado</td></tr>');
                return;
            }
            
            customers.forEach(c => {
                const isUser = c.source === 'user';
                const sourceLabel = isUser 
                    ? '<span class="status-btn status-pago" style="font-size:11px;">Registado</span>' 
                    : '<span class="status-btn status-pendente" style="font-size:11px;">Cliente</span>';
                const deleteBtn = isUser
                    ? `<button class="delete-btn" onclick="deleteUser(${c.id})"><i class="fas fa-trash"></i></button>`
                    : `<button class="delete-btn" onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button>`;
                const editBtn = isUser ? '' : `<button class="edit-btn" onclick="editCustomer(${c.id})"><i class="fas fa-edit"></i></button>`;
                tbody.append(`
                    <tr>
                        <td>${c.name}</td>
                        <td>${c.phone || '-'}</td>
                        <td>${c.email || '-'}</td>
                        <td>${sourceLabel}</td>
                        <td>
                            ${editBtn}
                            ${deleteBtn}
                        </td>
                    </tr>
                `);
            });
        });
}

$('#add-customer-form').submit(function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    
    $.ajax({
        url: '/api/customers',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            alert('Cliente adicionado!');
            $('#add-customer-form')[0].reset();
            $('#customer-form').slideUp();
            loadCustomers();
        },
        error: function(xhr) {
            if (xhr.responseJSON?.duplicate) {
                alert('Já existe um cliente com este telefone!');
            } else {
                alert('Erro ao adicionar cliente');
            }
        }
    });
});

function editCustomer(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;
    
    const form = $('#edit-customer-form');
    form.find('[name="id"]').val(customer.id);
    form.find('[name="name"]').val(customer.name);
    form.find('[name="phone"]').val(customer.phone);
    form.find('[name="email"]').val(customer.email || '');
    form.find('[name="notes"]').val(customer.notes || '');
    openModal('edit-customer-modal');
}

$('#edit-customer-form').submit(function(e) {
    e.preventDefault();
    const id = $(this).find('[name="id"]').val();
    const data = {
        name: $(this).find('[name="name"]').val(),
        phone: $(this).find('[name="phone"]').val(),
        email: $(this).find('[name="email"]').val(),
        notes: $(this).find('[name="notes"]').val()
    };
    
    $.ajax({
        url: `/api/customers/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function() {
            closeModal('edit-customer-modal');
            loadCustomers();
        }
    });
});

function deleteCustomer(id) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        $.ajax({
            url: `/api/customers/${id}`,
            method: 'DELETE',
            success: loadCustomers
        });
    }
}

function deleteUser(id) {
    if (confirm('Tem certeza que deseja excluir este utilizador registado?')) {
        $.ajax({
            url: `/api/admin/users/${id}`,
            method: 'DELETE',
            success: function() {
                loadCustomers();
            },
            error: function(xhr) {
                alert(xhr.responseJSON?.error || 'Erro ao excluir utilizador');
            }
        });
    }
}

// ========== RECURRING BOOKINGS MANAGEMENT ==========
let recurringBarbers = [];
let recurringServices = [];
let previewDates = [];

function loadRecurring() {
    $.get('/api/recurring-bookings')
        .done(function(recurrences) {
            const tbody = $('#recurring-table-body');
            tbody.empty();
            
            let activeCount = 0;
            let futureBookings = 0;
            const today = new Date().toISOString().split('T')[0];
            
            if (recurrences.length === 0) {
                tbody.append('<tr><td colspan="7" style="text-align:center;">Nenhum agendamento recorrente</td></tr>');
            } else {
                recurrences.forEach(r => {
                    if (r.status === 'active') activeCount++;
                    
                    const frequencyMap = {
                        'daily': 'Diário',
                        'weekly': 'Semanal',
                        'biweekly': 'Quinzenal',
                        'monthly': 'Mensal',
                        'custom': 'Personalizado'
                    };
                    
                    const statusClass = r.status === 'active' ? 'success' : 'danger';
                    const statusText = r.status === 'active' ? 'Ativo' : 'Cancelado';
                    
                    tbody.append(`
                        <tr>
                            <td>${r.customer_name || 'N/A'}<br><small>${r.customer_phone || ''}</small></td>
                            <td>${r.barber_name || 'N/A'}</td>
                            <td>${frequencyMap[r.frequency] || r.frequency}</td>
                            <td>${r.time}</td>
                            <td>${r.start_date ? formatDate(r.start_date) : '-'}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>
                                <button class="edit-btn" onclick="viewRecurrenceDetails(${r.id})"><i class="fas fa-eye"></i></button>
                                ${r.status === 'active' ? `<button class="delete-btn" onclick="cancelRecurrence(${r.id})" title="Cancelar"><i class="fas fa-ban"></i></button>` : `<button class="delete-btn" onclick="deleteRecurrence(${r.id})" title="Apagar"><i class="fas fa-trash"></i></button>`}
                            </td>
                        </tr>
                    `);
                });
            }
            
            $('#recurring-active-count').text(activeCount);
            
            // Count future bookings
            $.get('/api/bookings')
                .done(function(bookings) {
                    futureBookings = bookings.filter(b => b.is_recurring && b.date >= today && b.status !== 'cancelado').length;
                    $('#recurring-total-bookings').text(futureBookings);
                });
        });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

function openRecurringModal() {
    // Reset form
    $('#recurring-form')[0].reset();
    $('#recurring-customer-id').val('');
    $('#duplicate-customer-alert').hide();
    $('#recurrence-preview').hide();
    foundDuplicateCustomer = null;
    previewDates = [];
    
    // Set default date
    const today = new Date();
    $('#recurring-start-date').val(today.toISOString().split('T')[0]);
    
    // Load barbers and services
    $.when(
        $.get('/api/barbers'),
        $.get('/api/services')
    ).done(function(barbersRes, servicesRes) {
        recurringBarbers = barbersRes[0];
        recurringServices = servicesRes[0];
        
        const barberSelect = $('#recurring-barber');
        barberSelect.html('<option value="">Selecione...</option>');
        recurringBarbers.forEach(b => {
            barberSelect.append(`<option value="${b.id}">${b.name}</option>`);
        });
        
        const serviceSelect = $('#recurring-service');
        serviceSelect.html('<option value="">Selecione...</option>');
        recurringServices.forEach(s => {
            const duration = s.duration ? ` (${s.duration})` : '';
            serviceSelect.append(`<option value="${s.id}" data-duration="${s.duration}" data-price="${s.price}">${s.name}${duration} - €${parseFloat(s.price).toFixed(2)}</option>`);
        });
    });
    
    updateRecurrenceOptions();
    openModal('recurring-modal');
}

// Customer search
let searchTimeout;
$('#recurring-customer-search').on('input', function() {
    const query = $(this).val();
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        $('#customer-search-results').removeClass('show').empty();
        return;
    }
    
    searchTimeout = setTimeout(function() {
        $.get('/api/customers/search', { q: query })
            .done(function(results) {
                const dropdown = $('#customer-search-results');
                dropdown.empty();
                
                if (results.length === 0) {
                    dropdown.append('<div class="search-result-item">Nenhum cliente encontrado</div>');
                } else {
                    results.forEach(c => {
                        dropdown.append(`
                            <div class="search-result-item" onclick="selectCustomer(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.phone}', '${c.email || ''}')">
                                <div class="name">${c.name}</div>
                                <div class="phone">${c.phone}</div>
                            </div>
                        `);
                    });
                }
                dropdown.addClass('show');
            });
    }, 300);
});

function selectCustomer(id, name, phone, email) {
    $('#recurring-customer-id').val(id);
    $('#recurring-customer-name').val(name);
    $('#recurring-customer-phone').val(phone);
    $('#recurring-customer-email').val(email);
    $('#recurring-customer-search').val(name);
    $('#customer-search-results').removeClass('show');
    $('#duplicate-customer-alert').hide();
}

// Check for duplicate when phone changes
$('#recurring-customer-phone').on('blur', function() {
    const phone = $(this).val();
    if (!phone || $('#recurring-customer-id').val()) return;
    
    $.get('/api/customers/check-duplicate', { phone })
        .done(function(result) {
            if (result.exists) {
                foundDuplicateCustomer = result.customer;
                $('#duplicate-customer-alert').show();
            } else {
                foundDuplicateCustomer = null;
                $('#duplicate-customer-alert').hide();
            }
        });
});

function useExistingCustomer() {
    if (foundDuplicateCustomer) {
        selectCustomer(
            foundDuplicateCustomer.id,
            foundDuplicateCustomer.name,
            foundDuplicateCustomer.phone,
            foundDuplicateCustomer.email || ''
        );
        foundDuplicateCustomer = null;
    }
}

// Click outside to close search results
$(document).on('click', function(e) {
    if (!$(e.target).closest('.customer-search-wrapper').length) {
        $('#customer-search-results').removeClass('show');
    }
});

function updateRecurrenceOptions() {
    const frequency = $('#recurring-frequency').val();
    
    if (frequency === 'custom') {
        $('#interval-group').show();
    } else {
        $('#interval-group').hide();
    }
    
    if (frequency === 'weekly' || frequency === 'biweekly') {
        $('#days-of-week-group').show();
    } else {
        $('#days-of-week-group').hide();
    }
}

function updateEndTypeFields() {
    const endType = $('#recurring-end-type').val();
    
    if (endType === 'occurrences') {
        $('#occurrences-group').show();
        $('#end-date-group').hide();
    } else if (endType === 'end-date') {
        $('#occurrences-group').hide();
        $('#end-date-group').show();
    } else {
        $('#occurrences-group').hide();
        $('#end-date-group').hide();
    }
}

function previewRecurrence() {
    const startDate = $('#recurring-start-date').val();
    const frequency = $('#recurring-frequency').val();
    const endType = $('#recurring-end-type').val();
    const barberId = $('#recurring-barber').val();
    const time = $('#recurring-time').val();
    
    if (!startDate || !barberId || !time) {
        alert('Por favor, preencha data, barbeiro e horário');
        return;
    }
    
    // Get selected days of week
    const daysOfWeek = [];
    $('input[name="weekday"]:checked').each(function() {
        daysOfWeek.push(parseInt($(this).val()));
    });
    
    let intervalValue = 1;
    if (frequency === 'custom') {
        intervalValue = parseInt($('#recurring-interval').val()) || 1;
    }
    
    const requestData = {
        startDate,
        frequency,
        intervalValue,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null
    };
    
    if (endType === 'occurrences') {
        requestData.occurrences = parseInt($('#recurring-occurrences').val()) || 10;
    } else if (endType === 'end-date') {
        requestData.endDate = $('#recurring-end-date').val();
    }
    
    $.ajax({
        url: '/api/recurring-bookings/preview',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function(result) {
            previewDates = result.dates;
            $('#preview-count').text(result.count);
            
            const list = $('#preview-dates-list');
            list.empty();
            
            result.dates.forEach(date => {
                const d = new Date(date);
                const formatted = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                list.append(`<span class="preview-date-item">${formatted}</span>`);
            });
            
            // Check for conflicts
            const service = recurringServices.find(s => s.id == $('#recurring-service').val());
            const duration = service?.duration ? parseInt(service.duration.match(/\d+/)?.[0] || 30) : 30;
            
            $.ajax({
                url: '/api/recurring-bookings/check-conflicts',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    barberId,
                    dates: result.dates,
                    time,
                    duration
                }),
                success: function(conflictResult) {
                    if (conflictResult.hasConflicts) {
                        $('#preview-conflicts').show();
                        const conflictsList = $('#conflicts-list');
                        conflictsList.empty();
                        
                        conflictResult.conflicts.forEach(c => {
                            conflictsList.append(`<div>• ${formatDate(c.date)} às ${c.time} - ${c.reason} (${c.customer})</div>`);
                        });
                        
                        // Mark conflict dates
                        result.dates.forEach((date, idx) => {
                            if (conflictResult.conflicts.some(c => c.date === date)) {
                                list.find('.preview-date-item').eq(idx).addClass('conflict');
                            }
                        });
                    } else {
                        $('#preview-conflicts').hide();
                    }
                }
            });
            
            $('#recurrence-preview').show();
        },
        error: function(xhr) {
            alert('Erro ao calcular datas: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
        }
    });
}

$('#recurring-form').submit(function(e) {
    e.preventDefault();
    
    const barberId = $('#recurring-barber').val();
    const serviceId = $('#recurring-service').val();
    const barber = recurringBarbers.find(b => b.id == barberId);
    const service = recurringServices.find(s => s.id == serviceId);
    
    if (!barberId || !serviceId) {
        alert('Por favor, selecione barbeiro e serviço');
        return;
    }
    
    const daysOfWeek = [];
    $('input[name="weekday"]:checked').each(function() {
        daysOfWeek.push(parseInt($(this).val()));
    });
    
    const frequency = $('#recurring-frequency').val();
    let intervalValue = 1;
    if (frequency === 'custom') {
        intervalValue = parseInt($('#recurring-interval').val()) || 1;
    }
    
    const endType = $('#recurring-end-type').val();
    const duration = service?.duration ? parseInt(service.duration.match(/\d+/)?.[0] || 30) : 30;
    
    const requestData = {
        customerId: $('#recurring-customer-id').val() || null,
        customerName: $('#recurring-customer-name').val(),
        customerPhone: $('#recurring-customer-phone').val(),
        customerEmail: $('#recurring-customer-email').val(),
        barberId: parseInt(barberId),
        barberName: barber?.name,
        serviceIds: [parseInt(serviceId)],
        serviceName: service?.name,
        frequency,
        intervalValue,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null,
        time: $('#recurring-time').val(),
        duration,
        totalPrice: parseFloat(service?.price || 0),
        startDate: $('#recurring-start-date').val()
    };
    
    if (endType === 'occurrences') {
        requestData.occurrences = parseInt($('#recurring-occurrences').val()) || 10;
    } else if (endType === 'end-date') {
        requestData.endDate = $('#recurring-end-date').val();
    }
    
    $('#recurring-submit-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Criando...');
    
    $.ajax({
        url: '/api/recurring-bookings',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(requestData),
        success: function(result) {
            alert(`Sucesso! ${result.count} agendamentos criados.`);
            closeModal('recurring-modal');
            loadRecurring();
        },
        error: function(xhr) {
            const error = xhr.responseJSON;
            if (error?.conflicts) {
                alert('Existem conflitos de horário:\n' + error.conflicts.map(c => `${c.date} às ${c.time}`).join('\n'));
            } else {
                alert('Erro ao criar agendamentos: ' + (error?.error || 'Erro desconhecido'));
            }
        },
        complete: function() {
            $('#recurring-submit-btn').prop('disabled', false).html('<i class="fas fa-check"></i> Criar Agendamentos');
        }
    });
});

function viewRecurrenceDetails(id) {
    $.get(`/api/recurring-bookings/${id}`)
        .done(function(result) {
            const r = result.recurrence;
            const bookings = result.bookings;
            
            const frequencyMap = {
                'daily': 'Diário',
                'weekly': 'Semanal',
                'biweekly': 'Quinzenal',
                'monthly': 'Mensal',
                'custom': 'Personalizado'
            };
            
            let html = `
                <div class="recurrence-info">
                    <div class="recurrence-info-item">
                        <label>Cliente</label>
                        <span>${r.customer_name || 'N/A'}</span>
                    </div>
                    <div class="recurrence-info-item">
                        <label>Telefone</label>
                        <span>${r.customer_phone || 'N/A'}</span>
                    </div>
                    <div class="recurrence-info-item">
                        <label>Barbeiro</label>
                        <span>${r.barber_name || 'N/A'}</span>
                    </div>
                    <div class="recurrence-info-item">
                        <label>Frequência</label>
                        <span>${frequencyMap[r.frequency] || r.frequency}</span>
                    </div>
                    <div class="recurrence-info-item">
                        <label>Horário</label>
                        <span>${r.time}</span>
                    </div>
                    <div class="recurrence-info-item">
                        <label>Status</label>
                        <span>${r.status === 'active' ? 'Ativo' : 'Cancelado'}</span>
                    </div>
                </div>
                
                <h3>Eventos (${bookings.length})</h3>
                <div class="recurrence-bookings-list">
            `;
            
            bookings.forEach(b => {
                const statusClass = b.status === 'cancelado' ? 'cancelled' : '';
                html += `
                    <div class="recurrence-booking-item ${statusClass}">
                        <span class="date-time">${formatDate(b.date)} às ${b.time}</span>
                        <span class="status ${b.status}">${b.status}</span>
                        ${b.status !== 'cancelado' ? `<button class="delete-btn" onclick="cancelSingleBooking(${r.id}, ${b.id})"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                `;
            });
            
            html += `</div>`;
            
            if (r.status === 'active') {
                html += `
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn-cancel-future" onclick="cancelFutureBookings(${r.id})">
                            <i class="fas fa-forward"></i> Cancelar Futuros
                        </button>
                        <button class="btn-cancel-all" onclick="cancelAllRecurrence(${r.id})">
                            <i class="fas fa-trash"></i> Excluir Tudo
                        </button>
                    </div>
                `;
            }
            
            $('#recurrence-details-content').html(html);
            openModal('recurrence-details-modal');
        });
}

function cancelSingleBooking(recurrenceId, bookingId) {
    if (!confirm('Cancelar este agendamento específico?')) return;
    
    $.ajax({
        url: `/api/recurring-bookings/${recurrenceId}/bookings/${bookingId}/cancel`,
        method: 'PUT',
        success: function() {
            viewRecurrenceDetails(recurrenceId);
        }
    });
}

function cancelFutureBookings(id) {
    if (!confirm('Cancelar todos os agendamentos futuros desta série?')) return;
    
    $.ajax({
        url: `/api/recurring-bookings/${id}/cancel-future`,
        method: 'PUT',
        success: function() {
            closeModal('recurrence-details-modal');
            loadRecurring();
        }
    });
}

function cancelAllRecurrence(id) {
    if (!confirm('ATENÇÃO: Isso irá excluir toda a série de agendamentos. Continuar?')) return;
    
    $.ajax({
        url: `/api/recurring-bookings/${id}`,
        method: 'DELETE',
        success: function() {
            closeModal('recurrence-details-modal');
            loadRecurring();
        }
    });
}

function cancelRecurrence(id) {
    if (!confirm('Cancelar todos os agendamentos futuros desta recorrência?')) return;
    
    $.ajax({
        url: `/api/recurring-bookings/${id}/cancel-future`,
        method: 'PUT',
        success: loadRecurring
    });
}

function deleteRecurrence(id) {
    if (!confirm('Apagar permanentemente esta recorrência e todos os seus agendamentos?')) return;
    
    showLoading('A apagar recorrência do sistema...');
    
    $.ajax({
        url: `/api/recurring-bookings/${id}/delete-all`,
        method: 'DELETE',
        success: function() {
            hideLoading();
            loadRecurring();
        },
        error: function(xhr) {
            hideLoading();
            alert('Erro ao apagar: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
        }
    });
}

function deleteAllRecurring() {
    if(!confirm('ATENÇÃO: Isso vai apagar TODAS as recorrências e seus agendamentos! Tem certeza?')) return;
    if(!confirm('Esta ação é irreversível. Confirma?')) return;
    
    showLoading('A apagar recorrências do sistema...');
    
    $.ajax({
        url: '/api/recurring-bookings/delete-all',
        method: 'DELETE',
        success: function(response) {
            hideLoading();
            loadRecurring();
            loadBookings();
            loadDashboard();
        },
        error: function(xhr) {
            hideLoading();
            alert('Erro ao apagar: ' + (xhr.responseJSON?.error || 'Erro desconhecido'));
        }
    });
}

// ========== CALENDAR VIEW ==========
let calendarDate = new Date();
let calendarView = 'month';
let calendarBookings = [];
let allBookingsCache = [];
let calendarBarbers = [];

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function loadCalendarView() {
    const currentFilter = $('#calendar-barber-filter').val();
    
    // Load barbers for filter (only if not already loaded)
    if (calendarBarbers.length === 0) {
        $.get('/api/barbers').done(function(barbers) {
            calendarBarbers = barbers;
            const select = $('#calendar-barber-filter');
            select.html('<option value="">Todos</option>');
            barbers.forEach(b => {
                select.append(`<option value="${b.id}">${b.name}</option>`);
            });
            if (currentFilter) {
                select.val(currentFilter);
            }
        });
    }
    
    $.get('/api/bookings?includeRecurring=true').done(function(bookings) {
        calendarBookings = bookings.map(b => {
            if (b.date && b.date.includes('T')) {
                b.date = b.date.split('T')[0];
            }
            return b;
        });
        renderCalendar();
    });
}


function setCalendarView(view) {
    calendarView = view;
    $('.view-btn').removeClass('active');
    $(`.view-btn[data-view="${view}"]`).addClass('active');
    
    $('#month-view, #week-view, #day-view').hide();
    $(`#${view}-view`).show();
    
    renderCalendar();
}

function calendarPrev() {
    if (calendarView === 'month') {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
    } else if (calendarView === 'week') {
        calendarDate.setDate(calendarDate.getDate() - 7);
    } else {
        calendarDate.setDate(calendarDate.getDate() - 1);
    }
    renderCalendar();
}

function calendarNext() {
    if (calendarView === 'month') {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
    } else if (calendarView === 'week') {
        calendarDate.setDate(calendarDate.getDate() + 7);
    } else {
        calendarDate.setDate(calendarDate.getDate() + 1);
    }
    renderCalendar();
}

function calendarToday() {
    calendarDate = new Date();
    renderCalendar();
}

function renderCalendar() {
    const filteredBarberId = $('#calendar-barber-filter').val();
    let bookings = calendarBookings.filter(b => b.status !== 'cancelado');
    
    if (filteredBarberId) {
        bookings = bookings.filter(b => b.barber_id == filteredBarberId);
    }
    
    if (calendarView === 'month') {
        renderMonthView(bookings);
    } else if (calendarView === 'week') {
        renderWeekView(bookings);
    } else {
        renderDayView(bookings);
    }
}

function renderMonthView(bookings) {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    $('#calendar-title').text(`${monthNames[month]} ${year}`);
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const grid = $('#calendar-grid');
    grid.empty();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayBookings = bookings.filter(b => b.date === dateStr);
        
        const isToday = date.getTime() === today.getTime();
        const isCurrentMonth = date.getMonth() === month;
        const isSunday = date.getDay() === 0;
        
        let cellClass = 'calendar-cell';
        if (isToday) cellClass += ' today';
        if (!isCurrentMonth) cellClass += ' other-month';
        if (isSunday) cellClass += ' sunday-cell';
        
        let eventsHtml = '';
        const maxShow = 3;
        dayBookings.slice(0, maxShow).forEach(b => {
            const barber = calendarBarbers.find(bar => bar.id === b.barber_id);
            const colorClass = barber ? `color-${barber.calendar_color || 5}` : '';
            const recurringIcon = b.is_recurring ? '<i class="fas fa-sync-alt recurring-icon"></i> ' : '';
            eventsHtml += `<div class="calendar-event ${colorClass}${b.is_recurring ? ' recurring' : ''}" title="${b.customer_name} - ${b.service_name} às ${b.time}">${recurringIcon}${b.time} ${b.customer_name}</div>`;
        });
        if (dayBookings.length > maxShow) {
            eventsHtml += `<span class="cell-count-badge">+${dayBookings.length - maxShow} mais</span>`;
        }
        
        grid.append(`
            <div class="${cellClass}" onclick="viewDayBookings('${dateStr}')">
                <div class="cell-date">${date.getDate()}</div>
                <div class="cell-events">${eventsHtml}</div>
            </div>
        `);
    }
}

function renderWeekView(bookings) {
    const startOfWeek = new Date(calendarDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    $('#calendar-title').text(`${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}/${endOfWeek.getFullYear()}`);
    
    const header = $('#week-header');
    const grid = $('#week-grid');
    header.empty();
    grid.empty();
    
    header.append('<div class="week-day-header"><i class="fas fa-clock"></i></div>');
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        const isToday = date.toDateString() === new Date().toDateString();
        const isSunday = i === 0;
        header.append(`<div class="week-day-header ${isToday ? 'today' : ''} ${isSunday ? 'sunday-header' : ''}">${dayNames[i]}<br><strong>${date.getDate()}</strong></div>`);
    }
    
    for (let hour = 9; hour <= 19; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        const isLunch = (hour === 13);
        
        grid.append(`<div class="week-time-label">${timeStr}</div>`);
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const isSunday = i === 0;
            
            const slotBookings = bookings.filter(b => {
                if (b.date !== dateStr) return false;
                const [bHour] = b.time.split(':').map(Number);
                return bHour === hour;
            });
            
            let content = '';
            slotBookings.forEach(b => {
                const recurringIcon = b.is_recurring ? '<i class="fas fa-sync-alt recurring-icon"></i> ' : '';
                content += `<div class="week-event${b.is_recurring ? ' recurring' : ''}" onclick="viewBookingDetails(${b.id})">${recurringIcon}${b.time} ${b.customer_name}</div>`;
            });
            
            let cellClass = 'week-cell';
            if (isLunch) cellClass += ' lunch-slot';
            if (isSunday) cellClass += ' sunday-col';
            
            const clickAction = (!isLunch && !isSunday && slotBookings.length === 0) 
                ? `onclick="quickCreateBooking('${dateStr}', '${timeStr}')"` : '';
            
            grid.append(`<div class="${cellClass}" ${clickAction}>${content}</div>`);
        }
    }
}

function renderDayView(bookings) {
    const dateStr = calendarDate.toISOString().split('T')[0];
    const dayBookings = bookings.filter(b => b.date === dateStr);
    const isSunday = calendarDate.getDay() === 0;
    
    $('#calendar-title').text(`${calendarDate.getDate()} de ${monthNames[calendarDate.getMonth()]} de ${calendarDate.getFullYear()}`);
    
    const timeline = $('#day-timeline');
    timeline.empty();
    
    for (let hour = 9; hour <= 19; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        const isLunch = (hour === 13);
        
        const slotBookings = dayBookings.filter(b => {
            const [bHour] = b.time.split(':').map(Number);
            return bHour === hour;
        });
        
        let eventsHtml = '';
        slotBookings.forEach(b => {
            const barber = calendarBarbers.find(bar => bar.id === b.barber_id);
            const colorClass = barber ? `color-${barber.calendar_color || 5}` : '';
            const recurringIcon = b.is_recurring ? '<i class="fas fa-sync-alt recurring-icon"></i> ' : '';
            eventsHtml += `
                <div class="day-event ${colorClass}${b.is_recurring ? ' recurring' : ''}" onclick="event.stopPropagation(); viewBookingDetails(${b.id})">
                    ${recurringIcon}<strong>${b.time}</strong> - ${b.customer_name}<br>
                    <small>${b.service_name} | ${b.barber_name || 'N/A'}</small><br>
                    <small>€${parseFloat(b.total_price || 0).toFixed(2)}${b.is_recurring ? ' | Recorrente' : ''}</small>
                </div>
            `;
        });
        
        let rowClass = 'day-row';
        if (isLunch) rowClass += ' lunch-break';
        if (isSunday) rowClass += ' closed-day';
        
        const clickAction = (!isLunch && !isSunday && slotBookings.length === 0) 
            ? `onclick="quickCreateBooking('${dateStr}', '${timeStr}')"` 
            : '';
        
        timeline.append(`
            <div class="${rowClass}" ${clickAction}>
                <div class="day-time">${timeStr}</div>
                <div class="day-events">${isLunch ? '<span class="lunch-label"><i class="fas fa-utensils"></i> Almoço</span>' : (isSunday ? '<span class="closed-label">Fechado</span>' : (eventsHtml || `<span class="no-events clickable-slot">${clickAction ? '<i class="fas fa-plus-circle"></i> Criar agendamento' : '-'}</span>`))}</div>
            </div>
        `);
    }
}

function viewDayBookings(dateStr) {
    calendarDate = new Date(dateStr + 'T12:00:00');
    setCalendarView('day');
}

function quickCreateBooking(date, time) {
    openCreateBookingModal();
    setTimeout(() => {
        $('#create-booking-modal input[name="date"]').val(date);
        $('#create-booking-modal select[name="time"]').val(time);
    }, 100);
}

function viewBookingDetails(bookingId) {
    const booking = calendarBookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const modal = $(`
        <div class="modal-overlay" id="booking-details-modal" onclick="if(event.target===this)this.remove()">
            <div class="modal-content" style="max-width:450px;">
                <h2><i class="fas fa-calendar-check"></i> Detalhes do Agendamento</h2>
                <div style="padding:15px 0;">
                    <p><strong><i class="fas fa-user"></i> Cliente:</strong> ${booking.customer_name}</p>
                    <p><strong><i class="fas fa-phone"></i> Telefone:</strong> ${booking.customer_phone || 'N/A'}</p>
                    <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${booking.customer_email || 'N/A'}</p>
                    <p><strong><i class="fas fa-cut"></i> Serviço:</strong> ${booking.service_name}</p>
                    <p><strong><i class="fas fa-user-tie"></i> Barbeiro:</strong> ${booking.barber_name || 'N/A'}</p>
                    <p><strong><i class="fas fa-calendar"></i> Data:</strong> ${booking.date}</p>
                    <p><strong><i class="fas fa-clock"></i> Hora:</strong> ${booking.time}</p>
                    <p><strong><i class="fas fa-euro-sign"></i> Valor:</strong> €${parseFloat(booking.total_price || 0).toFixed(2)}</p>
                    <p><strong><i class="fas fa-info-circle"></i> Status:</strong> <span class="status-${booking.status}">${booking.status}</span></p>
                    ${booking.is_recurring ? '<p><strong><i class="fas fa-sync-alt"></i></strong> Agendamento Recorrente</p>' : ''}
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button class="action-btn danger" onclick="deleteBooking(${booking.id}); document.getElementById('booking-details-modal').remove();"><i class="fas fa-trash"></i> Apagar</button>
                    <button class="action-btn" onclick="document.getElementById('booking-details-modal').remove()">Fechar</button>
                </div>
            </div>
        </div>
    `);
    $('body').append(modal);
}

function openDeleteByNameModal() {
    const modal = $(`
        <div class="modal-overlay" id="delete-by-name-modal" onclick="if(event.target===this)this.remove()">
            <div class="modal-content" style="max-width:450px;">
                <h2><i class="fas fa-user-times"></i> Apagar Agendamentos por Nome</h2>
                <div style="padding:15px 0;">
                    <p style="margin-bottom:10px;">Digite o nome do cliente para apagar todos os seus agendamentos:</p>
                    <input type="text" id="delete-by-name-input" placeholder="Nome do cliente..." style="width:100%;padding:10px;border:1px solid #444;background:#222;color:#fff;border-radius:5px;font-size:14px;">
                    <p style="margin-top:10px;color:#999;font-size:12px;"><i class="fas fa-info-circle"></i> Todos os agendamentos que contenham este nome serão apagados.</p>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button class="action-btn danger" onclick="executeDeleteByName()"><i class="fas fa-trash"></i> Apagar</button>
                    <button class="action-btn" onclick="document.getElementById('delete-by-name-modal').remove()">Cancelar</button>
                </div>
            </div>
        </div>
    `);
    $('body').append(modal);
    setTimeout(() => $('#delete-by-name-input').focus(), 100);
}

function executeDeleteByName() {
    const name = $('#delete-by-name-input').val().trim();
    if (!name) {
        alert('Por favor, digite um nome.');
        return;
    }
    if (!confirm(`Tem certeza que deseja apagar TODOS os agendamentos de "${name}"?`)) return;
    
    $.ajax({
        url: '/api/bookings/delete-by-name',
        method: 'DELETE',
        contentType: 'application/json',
        data: JSON.stringify({ name }),
        success: function(response) {
            alert(`${response.deleted} agendamento(s) apagado(s) com sucesso.`);
            $('#delete-by-name-modal').remove();
            loadBookings();
            loadDashboard();
            loadCalendarView();
        },
        error: function(xhr) {
            alert('Erro ao apagar agendamentos');
            if (xhr.status === 401) checkAuth();
        }
    });
}
