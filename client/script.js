const bookingData = {
    services: [],
    totalPrice: 0,
    store: '',
    barber: '',
    barberName: '',
    name: '',
    email: '',
    phone: '',
    date: '',
    time: ''
};

// Dados das lojas e barbeiros
const storeData = {
    '1': {
        name: 'EVANDRO GARCIA - Centro',
        address: 'Largo de Camões n3, 8000-140 Faro',
        calendarId: 'barbearia.evandrogarcia2@gmail.com',
        phone: '289 042 683',
        whatsapp: '925124104',
        hours: 'Seg-Sab: 9h às 20h',
        feature: 'Studio de Tatuagem incluso',
        barbers: [
            {
                id: '1',
                name: 'Evandro Garcia',
                photo: 'assets/barbers/evandro.jpg',
                specialty: 'Especialista em Cortes Clássicos',
                experience: '15 anos de experiência'
            },
            {
                id: '2', 
                name: 'Batista',
                photo: 'assets/barbers/batista.jpg',
                specialty: 'Mestre em Barbas',
                experience: '8 anos de experiência'
            },
            {
                id: '3',
                name: 'William',
                photo: 'assets/barbers/william.jpg',
                specialty: 'Estilista Moderno',
                experience: '6 anos de experiência'
            }
        ]
    }
};

// Músicas disponíveis (carregadas do banco de dados)
let musicPlaylist = [];

// Authentication Status Check (uses localStorage)
function checkAuthStatus() {
    checkAuthOnLoad();
}

// Variáveis do player de música
let currentMusicIndex = 0;
let isPlaying = false;
let audioElement = null;

// Função para verificar se um slot tem sobreposição com eventos ocupados
function checkSlotOverlap(slotTime, serviceDuration, busyIntervals) {
    // Converter horário do slot para minutos desde meia-noite
    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotStart = hours * 60 + minutes;
    const slotEnd = slotStart + serviceDuration;
    
    // Verificar se há sobreposição com algum evento ocupado
    for (const interval of busyIntervals) {
        // Sobreposição ocorre quando: slotStart < interval.end E slotEnd > interval.start
        if (slotStart < interval.end && slotEnd > interval.start) {
            return true; // Há sobreposição
        }
    }
    return false; // Não há sobreposição
}

// Função global para regenerar slots de horário quando o barbeiro é alterado
async function regenerateTimeSlotsForBarber() {
    const timeSlotsContainer = document.getElementById('time-slots');
    if (!timeSlotsContainer) return;
    
    timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #ccc;">Carregando horários...</p>';
    
    // Buscar intervalos ocupados do calendário
    let busyIntervals = [];
    if (bookingData.date && bookingData.barber) {
        try {
            const response = await fetch(`/api/busy-slots?date=${bookingData.date}&barberId=${bookingData.barber}`);
            const data = await response.json();
            busyIntervals = data.busyIntervals || [];
            console.log('🚫 Intervalos ocupados (barbeiro alterado):', busyIntervals);
        } catch (err) {
            console.error('Erro ao buscar horários ocupados:', err);
        }
    }
    
    // Calcular duração total dos serviços selecionados
    const serviceDuration = bookingData.totalDuration || 60; // padrão 60 minutos
    console.log(`⏱️ Duração do serviço: ${serviceDuration} minutos`);
    
    timeSlotsContainer.innerHTML = '';
    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        '17:00', '17:30', '18:00', '18:30'
    ];

    timeSlots.forEach(time => {
        const slot = document.createElement('div');
        const isOccupied = checkSlotOverlap(time, serviceDuration, busyIntervals);
        
        slot.className = 'time-slot' + (isOccupied ? ' occupied' : '');
        slot.textContent = time + (isOccupied ? ' (ocupado)' : '');
        
        if (isOccupied) {
            slot.style.opacity = '0.5';
            slot.style.cursor = 'not-allowed';
            slot.style.backgroundColor = '#333';
            slot.style.color = '#666';
        } else {
            slot.addEventListener('click', () => {
                document.querySelectorAll('.time-slot').forEach(s => {
                    s.classList.remove('selected');
                });
                slot.classList.add('selected');
                bookingData.time = time;
                
                // Atualizar estado do botão step 5
                const nextBtn = document.querySelector('.step-5 .booking-next-btn');
                if (nextBtn) {
                    nextBtn.disabled = !(bookingData.date && bookingData.time);
                }
                console.log('⏰ Horário selecionado:', bookingData.time);
            });
        }
        
        timeSlotsContainer.appendChild(slot);
    });
    
    // Atualizar estado do botão step 5
    const nextBtn = document.querySelector('.step-5 .booking-next-btn');
    if (nextBtn) {
        nextBtn.disabled = !(bookingData.date && bookingData.time);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing app');
    checkAuthStatus();
    checkMusicElements();
    initParticles();
    initCursor();
    initNavigation();
    initMusicPlayer();
    initGallery();
    initServices();
    initBooking();
    initScrollAnimations();
    initVideo();
    initSmoothScrolling();
});

function checkMusicElements() {
    console.log('🔍 Verificando elementos do player...');
    
    const elements = [
        'bg-music',
        'play-btn-navbar',
        'prev-btn-navbar',
        'next-btn-navbar',
        'music-disc-navbar',
        'progress-fill-navbar',
        'progress-bar-navbar',
        'current-time-navbar',
        'music-title-navbar',
        'play-icon-navbar',
        'pause-icon-navbar'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element ? '✅ Encontrado' : '❌ Não encontrado');
    });
}

function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function initCursor() {
    const cursorGlow = document.querySelector('.cursor-glow');
    if (!cursorGlow) return;
    
    document.addEventListener('mousemove', (e) => {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
        cursorGlow.style.opacity = '0.6';
    });
    
    document.addEventListener('mouseleave', () => {
        cursorGlow.style.opacity = '0';
    });
}

function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    if (!navbar || !menuToggle || !navMenu) return;
    
    // Efeito de scroll na navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Toggle do menu mobile
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        
        // Animar as barras do menu toggle
        const spans = menuToggle.querySelectorAll('span');
        if (navMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
    
    // Fechar menu ao clicar em um link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });
}

// Função global para fechar o menu mobile
function closeMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navMenu) navMenu.classList.remove('active');
    if (menuToggle) menuToggle.classList.remove('active');
    document.body.classList.remove('menu-open');
    
    // Resetar animação do menu toggle
    if (menuToggle) {
        const spans = menuToggle.querySelectorAll('span');
        if (spans.length >= 3) {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    }
}

async function initMusicPlayer() {
    audioElement = document.getElementById('bg-music');
    if (!audioElement) {
        console.error('❌ Elemento de áudio não encontrado');
        return;
    }
    
    // Carregar playlist do banco de dados
    try {
        const response = await fetch('/api/radio');
        const tracks = await response.json();
        if (tracks && tracks.length > 0) {
            musicPlaylist = tracks.map(t => ({
                title: t.title,
                artist: t.artist || '',
                src: t.url
            }));
            // Embaralhar playlist (Fisher-Yates shuffle)
            for (let i = musicPlaylist.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [musicPlaylist[i], musicPlaylist[j]] = [musicPlaylist[j], musicPlaylist[i]];
            }
            console.log('🎵 Playlist carregada e embaralhada:', musicPlaylist.length, 'músicas');
        } else {
            console.log('⚠️ Nenhuma música ativa no banco');
            return;
        }
    } catch (err) {
        console.error('❌ Erro ao carregar playlist:', err);
        return;
    }
    
    // Elementos do player da navbar
    const playBtn = document.getElementById('play-btn-navbar');
    const prevBtn = document.getElementById('prev-btn-navbar');
    const nextBtn = document.getElementById('next-btn-navbar');
    const musicDisc = document.getElementById('music-disc-navbar');
    const progressFill = document.getElementById('progress-fill-navbar');
    const progressBar = document.getElementById('progress-bar-navbar');
    const currentTimeEl = document.getElementById('current-time-navbar');
    const musicTitle = document.getElementById('music-title-navbar');
    const playIcon = document.getElementById('play-icon-navbar');
    const pauseIcon = document.getElementById('pause-icon-navbar');
    const musicPlayerContainer = document.querySelector('.music-player-integrated');
    
    console.log('🎵 Inicializando player de música...');
    console.log('📁 Playlist:', musicPlaylist);
    
    // Configurar volume inicial
    audioElement.volume = 0.7;
    
    // Carregar primeira música
    loadMusic(currentMusicIndex);
    
    // Event Listeners
    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', playPrevious);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', playNext);
    }
    
    if (progressBar) {
        progressBar.addEventListener('click', seek);
    }
    
    if (musicDisc) {
        musicDisc.addEventListener('click', togglePlay);
    }
    
    // Atualizar progresso da música
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', updateDuration);
    audioElement.addEventListener('ended', playNext);
    audioElement.addEventListener('error', handleAudioError);
    audioElement.addEventListener('canplay', handleCanPlay);
    
    // Funções do player
    function loadMusic(index) {
        if (index < 0) index = musicPlaylist.length - 1;
        if (index >= musicPlaylist.length) index = 0;
        
        currentMusicIndex = index;
        const music = musicPlaylist[index];
        
        console.log(`🎵 Carregando música ${index + 1}/${musicPlaylist.length}: ${music.title}`);
        console.log(`📂 Caminho: ${music.src}`);
        
        if (musicTitle) {
            musicTitle.textContent = music.title;
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = '0:00';
        }
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        // Resetar estado
        isPlaying = false;
        updatePlayButton();
        
        // Carregar nova música
        audioElement.src = music.src;
        
        // Tentar carregar a música
        audioElement.load();
    }
    
    function handleCanPlay() {
        console.log('✅ Música carregada e pronta para reprodução');
        // Tentar reproduzir automaticamente após carregar
        playMusic();
    }
    
    function playMusic() {
        console.log('▶️ Tentando reproduzir música...');
        
        audioElement.play().then(() => {
            console.log('✅ Música reproduzindo com sucesso');
            isPlaying = true;
            updatePlayButton();
            
            // Adicionar classe para animação do disco
            if (musicPlayerContainer) {
                musicPlayerContainer.classList.add('music-playing');
            }
            
        }).catch(error => {
            console.error('❌ Erro ao reproduzir:', error.name, error.message);
            
            // Se for erro de autoplay, esperar interação do usuário
            if (error.name === 'NotAllowedError') {
                console.log('⚠️ Autoplay bloqueado. Aguardando interação do usuário...');
                if (musicTitle) {
                    musicTitle.textContent = 'Clique para reproduzir';
                }
                
                // Adicionar listener para interação do usuário
                const playOnInteraction = () => {
                    console.log('👆 Usuário interagiu, tentando reproduzir...');
                    audioElement.play().then(() => {
                        isPlaying = true;
                        updatePlayButton();
                        if (musicPlayerContainer) musicPlayerContainer.classList.add('music-playing');
                        if (musicTitle) musicTitle.textContent = musicPlaylist[currentMusicIndex].title;
                    }).catch(e => {
                        console.error('❌ Ainda não foi possível reproduzir:', e);
                    });
                    
                    // Remover listeners após primeira interação
                    document.removeEventListener('click', playOnInteraction);
                    document.removeEventListener('touchstart', playOnInteraction, { passive: true });
                };
                
                document.addEventListener('click', playOnInteraction);
                document.addEventListener('touchstart', playOnInteraction, { passive: true });
            }
        });
    }
    
    function pauseMusic() {
        audioElement.pause();
        isPlaying = false;
        updatePlayButton();
        
        // Remover classe de animação do disco
        if (musicPlayerContainer) {
            musicPlayerContainer.classList.remove('music-playing');
        }
        
        console.log('⏸️ Música pausada');
    }
    
    function togglePlay() {
        console.log('🔄 Alternando reprodução. Estado atual:', isPlaying ? 'tocando' : 'pausado');
        if (isPlaying) {
            pauseMusic();
        } else {
            playMusic();
        }
    }
    
    function playPrevious() {
        console.log('⏮️ Mudando para música anterior');
        currentMusicIndex--;
        if (currentMusicIndex < 0) currentMusicIndex = musicPlaylist.length - 1;
        loadMusic(currentMusicIndex);
    }
    
    function playNext() {
        console.log('⏭️ Mudando para próxima música');
        currentMusicIndex++;
        if (currentMusicIndex >= musicPlaylist.length) currentMusicIndex = 0;
        loadMusic(currentMusicIndex);
    }
    
    function updatePlayButton() {
        if (playIcon && pauseIcon) {
            if (isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }
    
    function updateProgress() {
        if (!progressFill || !currentTimeEl) return;
        
        const currentTime = audioElement.currentTime;
        const duration = audioElement.duration;
        
        if (duration && !isNaN(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            progressFill.style.width = `${progressPercent}%`;
            currentTimeEl.textContent = formatTime(currentTime);
        }
    }
    
    function updateDuration() {
        console.log(`⏱️ Duração da música: ${formatTime(audioElement.duration)}`);
    }
    
    function seek(e) {
        if (!progressBar || !audioElement.duration || isNaN(audioElement.duration)) return;
        
        const progressBarRect = progressBar.getBoundingClientRect();
        const clickPosition = (e.clientX - progressBarRect.left) / progressBarRect.width;
        const seekTime = audioElement.duration * Math.max(0, Math.min(1, clickPosition));
        
        if (!isNaN(seekTime)) {
            audioElement.currentTime = seekTime;
        }
    }
    
    function handleAudioError(e) {
        console.error('❌ Erro no elemento de áudio:', e.target.error);
        console.error('Código:', e.target.error.code, 'Mensagem:', e.target.error.message);
        
        // Tentar próxima música se esta falhar
        setTimeout(() => {
            console.log('🔄 Tentando próxima música devido a erro...');
            playNext();
        }, 1000);
    }
    
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // Tentar iniciar música após um pequeno delay
    setTimeout(() => {
        console.log('🔄 Tentando iniciar música automaticamente...');
        // Primeiro carrega a música, depois tenta reproduzir
        loadMusic(currentMusicIndex);
    }, 500);
    
    console.log('🎵 Player de música inicializado com sucesso');
}

function initGallery() {
    const track = document.getElementById('gallery-track');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const items = document.querySelectorAll('.gallery-item');
    
    if (!track || !items.length) return;
    
    initGalleryVideos();
    
    let currentIndex = 0;
    let itemWidth = items[0].offsetWidth + 30;

    function updateCarousel() {
        const offset = -currentIndex * itemWidth;
        track.style.transform = `translateX(${offset}px)`;
        
        console.log(`Carrossel: índice ${currentIndex}, offset ${offset}px, largura item: ${itemWidth}px`);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex < items.length - 1) {
                currentIndex++;
                updateCarousel();
            }
        });
    }
    
    // Adicionar botões de play aos vídeos do carrossel
    addPlayButtonsToGalleryVideos();
    
    // Responsividade
    window.addEventListener('resize', () => {
        if (items.length > 0) {
            itemWidth = items[0].offsetWidth + 30;
            updateCarousel();
        }
    });
    
    // Inicializar
    updateCarousel();
    
    console.log(`Carrossel inicializado com ${items.length} itens`);
}

function initGalleryVideos() {
    const videos = document.querySelectorAll('.gallery-image-wrapper video');
    videos.forEach(video => {
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = false;
        
        // Adicionar evento de clique no vídeo
        video.addEventListener('click', function(e) {
            e.stopPropagation();
            const wrapper = this.closest('.gallery-image-wrapper');
            const playBtn = wrapper.querySelector('.gallery-play-btn');
            
            if (this.paused) {
                this.play().then(() => {
                    if (playBtn) playBtn.style.opacity = '0';
                }).catch(error => {
                    console.error('Erro ao reproduzir vídeo:', error);
                });
            } else {
                this.pause();
                if (playBtn) playBtn.style.opacity = '1';
            }
        });
        
        // Esconder botão play quando vídeo começar
        video.addEventListener('play', function() {
            const wrapper = this.closest('.gallery-image-wrapper');
            const playBtn = wrapper.querySelector('.gallery-play-btn');
            if (playBtn) playBtn.style.opacity = '0';
        });
        
        // Mostrar botão play quando vídeo pausar
        video.addEventListener('pause', function() {
            const wrapper = this.closest('.gallery-image-wrapper');
            const playBtn = wrapper.querySelector('.gallery-play-btn');
            if (playBtn) playBtn.style.opacity = '1';
        });
        
        // Esconder botão play quando vídeo terminar
        video.addEventListener('ended', function() {
            const wrapper = this.closest('.gallery-image-wrapper');
            const playBtn = wrapper.querySelector('.gallery-play-btn');
            if (playBtn) playBtn.style.opacity = '1';
        });
    });
}

function addPlayButtonsToGalleryVideos() {
    const videoWrappers = document.querySelectorAll('.gallery-image-wrapper');
    
    videoWrappers.forEach(wrapper => {
        const video = wrapper.querySelector('video');
        if (!video) return;
        
        // Verificar se já existe botão de play
        let playBtn = wrapper.querySelector('.gallery-play-btn');
        
        if (!playBtn) {
            // Criar botão de play no estilo do vídeo da seção Ambiente
            playBtn = document.createElement('div');
            playBtn.className = 'gallery-play-btn video-play-btn';
            playBtn.innerHTML = `
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="30" r="30" fill="var(--secondary-gold)"/>
                    <path d="M24 18L36 30L24 42V18Z" fill="var(--primary-black)"/>
                </svg>
            `;
            
            wrapper.appendChild(playBtn);
            
            // Adicionar evento de clique
            playBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (video.paused) {
                    video.play().then(() => {
                        this.style.opacity = '0';
                    }).catch(error => {
                        console.error('Erro ao reproduzir vídeo:', error);
                    });
                } else {
                    video.pause();
                    this.style.opacity = '1';
                }
            });
        }
        
        // Configurar estilo inicial
        playBtn.style.position = 'absolute';
        playBtn.style.top = '50%';
        playBtn.style.left = '50%';
        playBtn.style.transform = 'translate(-50%, -50%)';
        playBtn.style.zIndex = '10';
        playBtn.style.transition = 'opacity 0.3s ease';
        playBtn.style.opacity = video.paused ? '1' : '0';
        playBtn.style.cursor = 'pointer';
    });
}

function initVideo() {
    const video = document.getElementById('ambiente-video');
    const playBtn = document.getElementById('video-play-btn');
    const videoWrapper = document.querySelector('.video-wrapper.vertical-video');
    
    if (!video || !playBtn || !videoWrapper) return;

    playBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        video.play().then(() => {
            videoWrapper.classList.add('playing');
        }).catch(error => {
            console.error('Erro ao reproduzir:', error);
        });
    });
    
    videoWrapper.addEventListener('click', function(e) {
        if (e.target === videoWrapper || e.target === video) {
            if (video.paused) {
                video.play().then(() => {
                    videoWrapper.classList.add('playing');
                });
            } else {
                video.pause();
                videoWrapper.classList.remove('playing');
            }
        }
    });
    
    video.addEventListener('pause', function() {
        videoWrapper.classList.remove('playing');
    });
    
    video.addEventListener('ended', function() {
        videoWrapper.classList.remove('playing');
        video.currentTime = 0;
    });
}

function initServices() {
    // Função mantida para compatibilidade
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.service-card, .gallery-item, .section-header, .excelencia-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        });
    });
}

// Sistema de Agendamento (mantido igual)
function initBooking() {
    initializeServiceSelection();
    initializeStoreSelection();
    initializeBarberSelection();
    initializeCustomerForm();
    initializeDateTimeSelection();
    initializeNavigation();
    initializeConfirmation();
}

async function initializeServiceSelection() {
    const servicesContainer = document.getElementById('services-selection');
    const nextBtn = document.querySelector('.step-1 .booking-next-btn');
    
    if (!servicesContainer) return;
    
    // Carregar serviços do banco de dados
    try {
        const response = await fetch('/api/services');
        const services = await response.json();
        
        servicesContainer.innerHTML = '';
        
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-selection-card';
            card.dataset.service = service.name;
            card.dataset.price = service.price;
            // Extrair duração em minutos do campo duration (ex: "30 min" -> 30)
            const durationMatch = (service.duration || '60 min').match(/(\d+)/);
            const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
            card.dataset.duration = durationMinutes;
            
            card.innerHTML = `
                <div class="selection-check"></div>
                <h4>${service.name}</h4>
                <p class="selection-price">€${parseFloat(service.price).toFixed(2).replace('.', ',')}</p>
                <p class="selection-desc">${service.duration || ''}</p>
            `;
            
            card.addEventListener('click', () => {
                const serviceName = card.dataset.service;
                const price = parseFloat(card.dataset.price);
                const duration = parseInt(card.dataset.duration);

                card.classList.toggle('selected');
                
                if (card.classList.contains('selected')) {
                    bookingData.services.push({ name: serviceName, price: price, duration: duration });
                } else {
                    bookingData.services = bookingData.services.filter(s => s.name !== serviceName);
                }
                
                bookingData.totalPrice = bookingData.services.reduce((sum, s) => sum + s.price, 0);
                // Calcular duração total dos serviços selecionados
                bookingData.totalDuration = bookingData.services.reduce((sum, s) => sum + (s.duration || 60), 0);
                
                if (nextBtn) {
                    nextBtn.disabled = bookingData.services.length === 0;
                }

                console.log('✅ Serviços selecionados:', bookingData.services);
                console.log('⏱️ Duração total:', bookingData.totalDuration, 'minutos');
            });
            
            servicesContainer.appendChild(card);
        });
        
        console.log('📋 Serviços carregados do banco de dados:', services.length);
    } catch (error) {
        console.error('Erro ao carregar serviços:', error);
    }
}

function initializeStoreSelection() {
    const storeCards = document.querySelectorAll('.store-selection-card');
    const nextBtn = document.querySelector('.step-2 .booking-next-btn');

    // Auto-select store 1 since there's only one store
    bookingData.store = '1';
    if (nextBtn) {
        nextBtn.disabled = false;
    }

    storeCards.forEach(card => {
        card.addEventListener('click', () => {
            const storeId = card.dataset.store;
            
            // Remove selection from all stores
            storeCards.forEach(c => c.classList.remove('selected'));
            
            // Add selection to clicked store
            card.classList.add('selected');
            
            // Update booking data
            bookingData.store = storeId;
            
            // Enable next button
            if (nextBtn) {
                nextBtn.disabled = false;
            }

            console.log('🏪 Local selecionado:', storeId);
        });
    });
}

function initializeBarberSelection() {
    // Esta função será chamada quando a loja for selecionada
}

async function loadBarbers(storeId) {
    const barberSelection = document.getElementById('barber-selection');
    const nextBtn = document.querySelector('.step-3 .booking-next-btn');
    
    if (!barberSelection) return;

    // Clear previous barbers
    barberSelection.innerHTML = '';
    
    // Carregar barbeiros do banco de dados
    try {
        const response = await fetch('/api/barbers');
        const barbers = await response.json();
        
        if (!barbers || barbers.length === 0) {
            barberSelection.innerHTML = '<p>Nenhum barbeiro disponível</p>';
            return;
        }

        // Create barber cards
        barbers.forEach(barber => {
            const barberCard = document.createElement('div');
            barberCard.className = 'barber-selection-card';
            barberCard.innerHTML = `
                <img src="${(barber.photo || 'assets/barbers/default.jpg').startsWith('/') ? barber.photo : '/' + (barber.photo || 'assets/barbers/default.jpg')}" alt="${barber.name}" class="barber-photo" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJBcmlhbCI+QmFyYmVpcm88L3RleHQ+Cjwvc3ZnPgo='">
                <div class="barber-name">${barber.name}</div>
                <div class="barber-specialty">${barber.specialty || ''}</div>
                <div class="selection-check"></div>
            `;

            // Add click event
            barberCard.addEventListener('click', async () => {
                // Remove selection from all barbers
                document.querySelectorAll('.barber-selection-card').forEach(c => {
                    c.classList.remove('selected');
                });
                
                // Add selection to clicked barber
                barberCard.classList.add('selected');
                
                // Update booking data
                bookingData.barber = barber.id;
                bookingData.barberName = barber.name;
                
                // Se já houver uma data selecionada, atualizar os horários ocupados
                if (bookingData.date) {
                    bookingData.time = ''; // Reset time when barber changes
                    const timeSlotsContainer = document.getElementById('time-slots');
                    if (timeSlotsContainer) {
                        // Regenerar slots com novos horários ocupados do novo barbeiro
                        await regenerateTimeSlotsForBarber();
                    }
                }
            
                // Enable next button
                if (nextBtn) {
                    nextBtn.disabled = false;
                }

                console.log('💈 Barbeiro selecionado:', barber.name);
            });

            barberSelection.appendChild(barberCard);
        });
        
        console.log(`✅ ${barbers.length} barbeiros carregados do banco de dados`);
    } catch (error) {
        console.error('Erro ao carregar barbeiros:', error);
        barberSelection.innerHTML = '<p>Erro ao carregar barbeiros</p>';
    }
}

function initializeCustomerForm() {
    const nameInput = document.getElementById('customer-name');
    const emailInput = document.getElementById('customer-email');
    const phoneInput = document.getElementById('customer-phone');
    const nextBtn = document.querySelector('.step-4 .booking-next-btn');

    function validateForm() {
        const nameValid = nameInput && nameInput.value.trim().length > 0;
        const emailValid = emailInput && emailInput.value.includes('@') && emailInput.value.includes('.');
        const phoneValid = phoneInput && phoneInput.value.trim().length > 0;
        
        if (nextBtn) {
            nextBtn.disabled = !(nameValid && emailValid && phoneValid);
        }

        // ATUALIZA OS DADOS EM TEMPO REAL
        if (nameInput) bookingData.name = nameInput.value.trim();
        if (emailInput) bookingData.email = emailInput.value.trim();
        if (phoneInput) bookingData.phone = phoneInput.value.trim();

        console.log('📝 Dados do cliente atualizados:', {
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone
        });
    }

    // Event listeners para atualização em tempo real
    if (nameInput) {
        nameInput.addEventListener('input', validateForm);
        nameInput.addEventListener('blur', validateForm);
    }
    
    if (emailInput) {
        emailInput.addEventListener('input', validateForm);
        emailInput.addEventListener('blur', validateForm);
    }
    
    if (phoneInput) {
        phoneInput.addEventListener('input', validateForm);
        phoneInput.addEventListener('blur', validateForm);
    }

    // Validação inicial
    validateForm();
}

function initializeDateTimeSelection() {
    const dateInput = document.getElementById('booking-date');
    const timeSlotsContainer = document.getElementById('time-slots');
    const nextBtn = document.querySelector('.step-5 .booking-next-btn');

    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateInput) {
        dateInput.min = tomorrow.toISOString().split('T')[0];
    }

    if (dateInput) {
        dateInput.addEventListener('change', async function() {
            const selectedDate = new Date(this.value + 'T12:00:00');
            if (selectedDate.getDay() === 0) {
                timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #ff4444; font-weight: bold;">Fechado ao domingo. Por favor escolha outro dia.</p>';
                bookingData.date = '';
                bookingData.time = '';
                this.value = '';
                updateStep5Button();
                return;
            }
            bookingData.date = this.value;
            bookingData.time = '';
            await generateTimeSlots();
            updateStep5Button();
            console.log('📅 Data selecionada:', bookingData.date);
        });
    }

    async function generateTimeSlots() {
        if (!timeSlotsContainer) return;
        
        timeSlotsContainer.innerHTML = '<p style="text-align: center; color: #ccc;">Carregando horários...</p>';
        
        let busyIntervals = [];
        if (bookingData.date && bookingData.barber) {
            try {
                const response = await fetch(`/api/busy-slots?date=${bookingData.date}&barberId=${bookingData.barber}`);
                const data = await response.json();
                busyIntervals = data.busyIntervals || [];
                console.log('🚫 Intervalos ocupados:', busyIntervals);
            } catch (err) {
                console.error('Erro ao buscar horários ocupados:', err);
            }
        }
        
        const serviceDuration = bookingData.totalDuration || 60;
        console.log(`⏱️ Duração do serviço: ${serviceDuration} minutos`);
        
        timeSlotsContainer.innerHTML = '';
        const timeSlots = [
            '09:00', '10:00', '11:00', '12:00', 
            '14:00', '15:00', '16:00', 
            '17:00', '18:00', '19:00'
        ];

        timeSlots.forEach(time => {
            const slot = document.createElement('div');
            // Verificar sobreposição considerando duração do serviço
            const isOccupied = checkSlotOverlap(time, serviceDuration, busyIntervals);
            
            slot.className = 'time-slot' + (isOccupied ? ' occupied' : '');
            slot.textContent = time + (isOccupied ? ' (ocupado)' : '');
            
            if (isOccupied) {
                slot.style.opacity = '0.5';
                slot.style.cursor = 'not-allowed';
                slot.style.backgroundColor = '#333';
                slot.style.color = '#666';
            } else {
                slot.addEventListener('click', () => {
                    // Remove selection from all slots
                    document.querySelectorAll('.time-slot').forEach(s => {
                        s.classList.remove('selected');
                    });
                    
                    // Add selection to clicked slot
                    slot.classList.add('selected');
                    
                    // Update booking data
                    bookingData.time = time;
                    updateStep5Button();
                    console.log('⏰ Horário selecionado:', bookingData.time);
                });
            }
            
            timeSlotsContainer.appendChild(slot);
        });
    }

    function updateStep5Button() {
        if (nextBtn) {
            nextBtn.disabled = !(bookingData.date && bookingData.time);
            console.log('🔘 Botão step 5:', nextBtn.disabled ? 'desabilitado' : 'habilitado');
        }
    }

    // Initial setup (without async)
    generateTimeSlots().catch(console.error);
}


function initializeNavigation() {
    // Next buttons
    document.querySelectorAll('.booking-next-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const currentStep = index + 1;
            const nextStep = currentStep + 1;
            
            console.log(`🔄 Navegando do step ${currentStep} para step ${nextStep}`);
            
            // Special handling for step 2 -> 3 (load barbers)
            if (currentStep === 2 && bookingData.store) {
                loadBarbers(bookingData.store);
            }
            
            // Special handling for step 5 -> 6 (update summary)
            if (currentStep === 5) {
                updateSummary();
            }
            
            navigateToStep(currentStep, nextStep);
        });
    });

    // Back buttons
    document.querySelectorAll('.booking-back-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const currentStep = getCurrentStep();
            const prevStep = currentStep - 1;
            console.log(`🔙 Voltando do step ${currentStep} para step ${prevStep}`);
            navigateToStep(currentStep, prevStep);
        });
    });

    function getCurrentStep() {
        const activeStep = document.querySelector('.booking-step.active');
        if (!activeStep) return 1;
        const stepClass = activeStep.className.split(' ').find(cls => cls.startsWith('step-'));
        return parseInt(stepClass.replace('step-', ''));
    }

    function navigateToStep(fromStep, toStep) {
        const currentStepEl = document.querySelector(`.step-${fromStep}`);
        const nextStepEl = document.querySelector(`.step-${toStep}`);
        const currentProgress = document.querySelector(`[data-step="${fromStep}"]`);
        const nextProgress = document.querySelector(`[data-step="${toStep}"]`);

        if (currentStepEl && nextStepEl) {
            currentStepEl.classList.remove('active');
            nextStepEl.classList.add('active');
        }

        if (currentProgress && nextProgress) {
            currentProgress.classList.remove('active');
            nextProgress.classList.add('active');
        }
    }
}

function initializeConfirmation() {
    const confirmBtn = document.querySelector('.booking-confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmBooking);
    }
}

function updateSummary() {
    console.log('📋 Atualizando resumo com dados:', bookingData);
    
    const elements = {
        service: document.getElementById('summary-service'),
        price: document.getElementById('summary-price'),
        store: document.getElementById('summary-store'),
        barber: document.getElementById('summary-barber'),
        name: document.getElementById('summary-name'),
        email: document.getElementById('summary-email'),
        phone: document.getElementById('summary-phone'),
        date: document.getElementById('summary-date'),
        time: document.getElementById('summary-time')
    };

    // Update service summary
    if (elements.service) {
        const serviceNames = bookingData.services.map(s => s.name).join(', ');
        elements.service.textContent = serviceNames || 'Nenhum serviço selecionado';
        console.log('✅ Serviços:', serviceNames);
    }

    // Update price
    if (elements.price) {
        elements.price.textContent = `€${(bookingData.totalPrice || 0).toFixed(2)}`;
        console.log('✅ Preço:', bookingData.totalPrice);
    }

    // Update store
    if (elements.store) {
        const storeName = storeData[bookingData.store]?.name || 'Loja não selecionada';
        elements.store.textContent = storeName;
        console.log('✅ Loja:', storeName, 'Store ID:', bookingData.store);
    }

    // Update barber
    if (elements.barber) {
        elements.barber.textContent = bookingData.barberName || 'Barbeiro não selecionado';
        console.log('✅ Barbeiro:', bookingData.barberName);
    }

    // Update customer info
    if (elements.name) {
        elements.name.textContent = bookingData.name || 'Não informado';
        console.log('✅ Nome:', bookingData.name);
    }
    
    if (elements.email) {
        elements.email.textContent = bookingData.email || 'Não informado';
        console.log('✅ Email:', bookingData.email);
    }
    
    if (elements.phone) {
        elements.phone.textContent = bookingData.phone || 'Não informado';
        console.log('✅ Telefone:', bookingData.phone);
    }

    // Update date and time
    if (elements.date && bookingData.date) {
        const date = new Date(bookingData.date);
        const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        elements.date.textContent = formattedDate;
        console.log('✅ Data:', formattedDate);
    } else if (elements.date) {
        elements.date.textContent = 'Data não selecionada';
    }
    
    if (elements.time) {
        elements.time.textContent = bookingData.time || 'Horário não selecionado';
        console.log('✅ Horário:', bookingData.time);
    }

    console.log('📋 Resumo completo atualizado');
}

async function confirmBooking() {
    const confirmBtn = document.querySelector('.booking-confirm-btn');
    if (!confirmBtn) return;

    console.log('📤 Iniciando confirmação do agendamento...');

    // Validate all data
    if (!bookingData.services.length || !bookingData.store || !bookingData.barber || 
        !bookingData.name || !bookingData.email || !bookingData.phone || 
        !bookingData.date || !bookingData.time) {
        
        const missingFields = [];
        if (!bookingData.services.length) missingFields.push('serviços');
        if (!bookingData.store) missingFields.push('loja');
        if (!bookingData.barber) missingFields.push('barbeiro');
        if (!bookingData.name) missingFields.push('nome');
        if (!bookingData.email) missingFields.push('email');
        if (!bookingData.phone) missingFields.push('telefone');
        if (!bookingData.date) missingFields.push('data');
        if (!bookingData.time) missingFields.push('horário');
        
        showErrorMessage(`Por favor, preencha todos os campos: ${missingFields.join(', ')}`);
        return;
    }

    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span>Processando...';

    try {
        console.log('🔄 Enviando dados para o servidor:', bookingData);
        
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        console.log('📨 Resposta do servidor:', result);

        if (result.success) {
            showSuccessMessage(result.message || 'Agendamento confirmado com sucesso!');
        } else {
            throw new Error(result.message || result.error || 'Erro no agendamento');
        }

    } catch (error) {
        console.error('❌ Erro na confirmação:', error);
        showErrorMessage(error.message);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

function showSuccessMessage(message) {
    const bookingSummary = document.querySelector('.booking-summary');
    const bookingButtons = document.querySelector('.booking-buttons');
    const confirmationMessage = document.getElementById('confirmation-message');
    const calendarStatus = document.getElementById('calendar-status');

    if (bookingSummary) bookingSummary.style.display = 'none';
    if (bookingButtons) bookingButtons.style.display = 'none';
    if (confirmationMessage) confirmationMessage.classList.add('show');
    if (calendarStatus) {
        calendarStatus.textContent = message;
        calendarStatus.innerHTML = message.replace(/\n/g, '<br>');
    }

    console.log('✅ Agendamento confirmado:', message);

    setTimeout(resetBooking, 8000);
}

function showErrorMessage(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin: 20px 0;
        text-align: center;
        font-weight: bold;
    `;
    errorDiv.textContent = '❌ ' + message;

    const bookingContainer = document.querySelector('.booking-container');
    if (bookingContainer) {
        bookingContainer.insertBefore(errorDiv, bookingContainer.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    console.error('❌ Erro:', message);
}

function resetBooking() {
    console.log('🔄 Reiniciando formulário de agendamento...');

    // Reset booking data
    bookingData.services = [];
    bookingData.totalPrice = 0;
    bookingData.totalDuration = 0;
    bookingData.store = '';
    bookingData.barber = '';
    bookingData.barberName = '';
    bookingData.name = '';
    bookingData.email = '';
    bookingData.phone = '';
    bookingData.date = '';
    bookingData.time = '';

    // Reset UI selections
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    
    // Reset form inputs
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        if (input.type !== 'button' && input.type !== 'submit') {
            input.value = '';
        }
    });

    // Reset dynamic content
    const timeSlots = document.getElementById('time-slots');
    if (timeSlots) timeSlots.innerHTML = '';
    
    const barberSelection = document.getElementById('barber-selection');
    if (barberSelection) barberSelection.innerHTML = '';

    // Reset steps to first step
    document.querySelectorAll('.booking-step').forEach(step => step.classList.remove('active'));
    document.querySelector('.step-1').classList.add('active');
    
    document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));
    document.querySelector('[data-step="1"]').classList.add('active');

    // Show hidden elements
    const bookingSummary = document.querySelector('.booking-summary');
    const bookingButtons = document.querySelector('.booking-buttons');
    const confirmationMessage = document.getElementById('confirmation-message');
    
    if (bookingSummary) {
        bookingSummary.style.display = 'block';
        bookingSummary.style.opacity = '1';
    }
    if (bookingButtons) {
        bookingButtons.style.display = 'flex';
        bookingButtons.style.opacity = '1';
    }
    if (confirmationMessage) {
        confirmationMessage.classList.remove('show');
    }

    // Reset buttons
    document.querySelectorAll('.booking-next-btn').forEach(btn => {
        btn.disabled = true;
    });

    console.log('✅ Formulário reiniciado com sucesso');
}

// Loading spinner CSS
if (!document.querySelector('style[data-loading-spinner]')) {
    const style = document.createElement('style');
    style.setAttribute('data-loading-spinner', 'true');
    style.textContent = `
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error-message {
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
            animation: fadeIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ EVANDRO GARCIA - Sistema de agendamento carregado com sucesso!');

// Subscription Form Handling
function initSubscription() {
    const modal = document.getElementById('subscription-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('subscription-form');
    const planButtons = document.querySelectorAll('.plan-subscribe-btn');
    const planInput = document.getElementById('subscription-plan-input');
    const priceInput = document.getElementById('subscription-price-input');
    const selectedPlanName = document.getElementById('selected-plan-name');
    const selectedPlanPrice = document.getElementById('selected-plan-price');
    
    const planNames = {
        'corte': 'Assinatura Mensal Corte',
        'corte_barba': 'Assinatura Mensal Corte + Barba',
        'corte_ualg': 'Assinatura Mensal Corte UAlg'
    };
    
    const planPrices = {
        'corte': '€50,00/mês',
        'corte_barba': '€70,00/mês',
        'corte_ualg': '€45,00/mês'
    };
    
    // Handle individual plan button clicks
    planButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const plan = btn.dataset.plan;
            const price = btn.dataset.price;
            
            // Set hidden inputs
            planInput.value = plan;
            priceInput.value = price;
            
            // Update modal display
            selectedPlanName.textContent = planNames[plan];
            selectedPlanPrice.textContent = planPrices[plan];
            
            // Open modal
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        });
    });
    
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    }
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('.subscription-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Enviando...';
            
            const formData = new FormData(form);
            const planType = formData.get('subscriptionPlan');
            const data = {
                customerName: formData.get('customerName'),
                customerEmail: formData.get('customerEmail'),
                customerPhone: formData.get('customerPhone'),
                planType: planType,
                planName: planNames[planType],
                planPrice: parseFloat(formData.get('subscriptionPrice'))
            };
            
            try {
                const response = await fetch('/api/subscriptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    modal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    form.reset();
                    alert('Solicitação enviada com sucesso! Entraremos em contato em breve.');
                } else {
                    throw new Error('Erro ao enviar');
                }
            } catch (error) {
                console.error('Subscription error:', error);
                alert('Erro ao enviar solicitação. Tente novamente.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', initSubscription);

// ========== AUTH SYSTEM ==========
let currentUser = null;

function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-form').reset();
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

function openRegisterModal() {
    document.getElementById('register-modal').style.display = 'flex';
    document.getElementById('register-error').style.display = 'none';
    document.getElementById('register-form').reset();
}

function closeRegisterModal() {
    document.getElementById('register-modal').style.display = 'none';
}

function switchToRegister() {
    closeLoginModal();
    openRegisterModal();
}

function switchToLogin() {
    closeRegisterModal();
    openLoginModal();
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            closeLoginModal();
            updateAuthUI();
            console.log('Login bem-sucedido:', data.user.name);
        } else {
            errorDiv.textContent = data.error || 'Email ou senha incorretos';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro no login:', error);
        errorDiv.textContent = 'Erro de conexão. Tente novamente.';
        errorDiv.style.display = 'block';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const errorDiv = document.getElementById('register-error');
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'As senhas não coincidem';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'A senha deve ter pelo menos 6 caracteres';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            closeRegisterModal();
            updateAuthUI();
            console.log('Registro bem-sucedido:', data.user.name);
        } else {
            errorDiv.textContent = data.error || 'Erro ao registrar';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        errorDiv.textContent = 'Erro de conexão. Tente novamente.';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    const token = localStorage.getItem('authToken');
    
    // Invalidate token on server
    if (token) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }).catch(() => {});
    }
    
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    updateAuthUI();
    console.log('Logout realizado');
}

function updateAuthUI() {
    const loggedOutDiv = document.getElementById('auth-logged-out');
    const loggedInDiv = document.getElementById('auth-logged-in');
    const userNameSpan = document.getElementById('user-name');
    const adminBtn = document.getElementById('admin-panel-btn');
    
    // Mobile auth elements
    const mobileLoggedOut = document.getElementById('mobile-auth-logged-out');
    const mobileLoggedIn = document.getElementById('mobile-auth-logged-in');
    const mobileAdminBtn = document.getElementById('mobile-admin-btn');
    
    if (currentUser) {
        // Desktop
        if (loggedOutDiv) loggedOutDiv.style.display = 'none';
        if (loggedInDiv) loggedInDiv.style.display = 'flex';
        if (userNameSpan) userNameSpan.textContent = currentUser.name;
        
        // Mobile - use classes to override CSS !important
        if (mobileLoggedOut) mobileLoggedOut.classList.add('hidden');
        if (mobileLoggedIn) mobileLoggedIn.classList.add('visible');
        
        // Mostrar botão admin apenas para barbearia.evandrogarcia2@gmail.com
        if (currentUser.email === 'barbearia.evandrogarcia2@gmail.com') {
            if (adminBtn) adminBtn.style.display = 'inline-flex';
            if (mobileAdminBtn) mobileAdminBtn.style.display = 'inline-flex';
        } else {
            if (adminBtn) adminBtn.style.display = 'none';
            if (mobileAdminBtn) mobileAdminBtn.style.display = 'none';
        }
    } else {
        // Desktop
        if (loggedOutDiv) loggedOutDiv.style.display = 'flex';
        if (loggedInDiv) loggedInDiv.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        
        // Mobile - remove classes to restore default CSS
        if (mobileLoggedOut) mobileLoggedOut.classList.remove('hidden');
        if (mobileLoggedIn) mobileLoggedIn.classList.remove('visible');
        if (mobileAdminBtn) mobileAdminBtn.style.display = 'none';
    }
}

function checkAuthOnLoad() {
    const savedToken = localStorage.getItem('authToken');
    
    if (savedToken) {
        // Validate token with server
        fetch('/api/auth/me', {
            headers: {
                'Authorization': 'Bearer ' + savedToken
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Token inválido');
        })
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                updateAuthUI();
                console.log('Sessão restaurada:', currentUser.name);
            }
        })
        .catch(() => {
            // Token invalid - clear storage
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            currentUser = null;
            updateAuthUI();
        });
    }
}

// Fechar modais ao clicar fora
document.addEventListener('click', function(event) {
    if (event.target.id === 'login-modal') {
        closeLoginModal();
    }
    if (event.target.id === 'register-modal') {
        closeRegisterModal();
    }
});

// Função para mostrar/ocultar senha
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Inicializar autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', checkAuthOnLoad);
