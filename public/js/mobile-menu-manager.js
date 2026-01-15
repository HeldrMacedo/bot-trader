// js/mobile-menu-manager.js
// Gerenciador do menu hambúrguer mobile

class MobileMenuManager {
    constructor() {
        this.sidebar = null;
        this.menuToggle = null;
        this.closeButton = null;
        this.overlay = null;
        this.isOpen = false;

        // Referências aos botões originais
        this.creditButton = null;
        this.vipButton = null;
        this.iaButton = null;
        this.adminButton = null;

        this.init();
    }

    init() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {

        // 🔧 CRÍTICO: Garantir que elementos existam sempre em mobile
        this.ensureMobileElementsExist();

        // Obter elementos do DOM com seletores mais específicos
        this.sidebar = document.getElementById('mobile-sidebar');
        this.menuToggle = document.getElementById('mobile-menu-toggle');
        this.closeButton = document.getElementById('mobile-sidebar-close');
        this.overlay = document.querySelector('.mobile-sidebar-overlay');

        if (!this.sidebar) {
            console.error('❌ [MOBILE MENU] Sidebar não encontrada (#mobile-sidebar)');
            return;
        }

        if (!this.menuToggle) {
            console.error('❌ [MOBILE MENU] Menu toggle não encontrado (#mobile-menu-toggle)');
            return;
        }

        // 🔧 CRÍTICO: Forçar CSS base nos elementos sempre (como header mobile)
        this.forceMobileElementsCSS();

        // 🔧 CRÍTICO: Remover event listeners existentes antes de adicionar novos
        this.menuToggle.replaceWith(this.menuToggle.cloneNode(true));
        this.menuToggle = document.getElementById('mobile-menu-toggle');

        if (this.closeButton) {
            this.closeButton.replaceWith(this.closeButton.cloneNode(true));
            this.closeButton = document.getElementById('mobile-sidebar-close');
        }

        if (this.overlay) {
            this.overlay.replaceWith(this.overlay.cloneNode(true));
            this.overlay = document.querySelector('.mobile-sidebar-overlay');
        }

        // Adicionar event listeners com força
        this.menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (this.isOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        });

        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.closeMenu();
            });
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.closeMenu();
            });
        }

        // 🔧 NOVO: Event listener para tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {

                this.closeMenu();
            }
        });

        // Detectar mudanças de tamanho da tela
        window.addEventListener('resize', () => this.handleResize());

        // Tentar popular o menu imediatamente
        this.populateMenu();

        // Tentar novamente após delays (caso os botões ainda não existam)
        setTimeout(() => this.populateMenu(), 2000);
        setTimeout(() => this.populateMenu(), 5000);
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {

        if (!this.sidebar) {
            console.error('❌ [MOBILE MENU] Sidebar não encontrada para abrir');
            return;
        }

        // 🔧 CRÍTICO: Forçar CSS com força bruta (mesmo que header mobile)
        this.sidebar.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 280px !important;
            max-width: 80vw !important;
            height: 100vh !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            z-index: 2147483647 !important;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3) !important;
            overflow: hidden !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            transform: translateX(0) !important;
            transition: transform 0.3s ease !important;
            pointer-events: auto !important;
        `;

        this.sidebar.classList.add('active');
        this.menuToggle.classList.add('active');

        // 🔧 CRÍTICO: Forçar overlay com força bruta também
        if (this.overlay) {
            this.overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 2147483646 !important;
                display: block !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            `;
        }

        this.isOpen = true;

        // Prevenir scroll do body quando menu aberto
        document.body.style.overflow = 'hidden';

        // Repopular menu caso os botões tenham sido recriados
        this.populateMenu();


    }

    closeMenu() {

        if (!this.sidebar) {
            console.error('❌ [MOBILE MENU] Sidebar não encontrada para fechar');
            return;
        }

        // 🔧 CRÍTICO: Forçar CSS para esconder o menu com força bruta
        this.sidebar.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: -100% !important;
            width: 280px !important;
            max-width: 80vw !important;
            height: 100vh !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            z-index: 2147483647 !important;
            transition: left 0.3s ease !important;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3) !important;
            overflow: hidden !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            transform: translateX(-100%) !important;
            pointer-events: none !important;
        `;

        // Desativar classes
        this.sidebar.classList.remove('active');
        this.menuToggle.classList.remove('active');

        // 🔧 CRÍTICO: Forçar overlay escondido com força bruta
        if (this.overlay) {
            this.overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 2147483646 !important;
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
            `;
        }

        this.isOpen = false;

        // Restaurar scroll do body
        document.body.style.overflow = '';

    }

    handleResize() {
        // Fechar menu se tela aumentar para desktop ou não for dispositivo móvel
        if (!this.isMobileDevice() && this.isOpen) {
            this.closeMenu();
        }
    }

    // 🔧 NOVO: Detectar se é realmente um dispositivo móvel
    isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // Detectar dispositivos móveis reais através do User Agent
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        // Detectar tela touch
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Verificar largura da tela (mas só como critério adicional)
        const isSmallScreen = window.innerWidth <= 768;

        // Detectar orientação (dispositivos móveis geralmente suportam)
        const hasOrientationSupport = typeof window.orientation !== 'undefined';

        // Considerar móvel se: (tem UA móvel OU tem touch E tela pequena) E não é desktop
        const isDesktopUA = /Windows NT|Macintosh|Linux x86_64/i.test(userAgent);

        return (isMobileUA || (isTouchDevice && isSmallScreen && hasOrientationSupport)) && !isDesktopUA;
    }

    populateMenu() {
        const sidebarBody = document.getElementById('mobile-sidebar-body');
        if (!sidebarBody) {

            return;
        }

        // Limpar o conteúdo existente para evitar duplicação ao repopular
        sidebarBody.innerHTML = '';

        const menuItems = [];

        // 1. Header de Créditos (sempre visível no topo)
        const creditButton = document.getElementById('credito-visor');
        if (creditButton && creditButton.style.display !== 'none') {
            const creditText = creditButton.textContent || '0 Créditos';
            // Extrair apenas o número de créditos do texto
            const creditNumber = creditText.match(/\d+/) ? creditText.match(/\d+/)[0] : '0';
            const creditsHeader = document.createElement('div');
            creditsHeader.className = 'mobile-menu-credits-header';
            creditsHeader.innerHTML = `
                <div class="credits-info">
                    <div class="credits-details">
                        <div class="credits-amount" style="color: white !important; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">💰 Disponível ${creditNumber} Créditos</div>
                    </div>
                </div>
            `;
            sidebarBody.appendChild(creditsHeader);
        }


        // 2. Botão Admin (somente se for admin)
        this.adminButton = document.querySelector('.admin-vip-trigger');
        if (this.adminButton && this.adminButton.style.display !== 'none') {

            menuItems.push({
                text: 'Administração VIP',
                icon: '👑',
                onClick: () => {
                    this.closeMenu();
                    setTimeout(() => this.adminButton.click(), 100);
                }
            });
        }

        // 3. Botão VIP (upgrade para VIP)
        this.vipButton = document.querySelector('.vip-upgrade-button');
        if (this.vipButton && this.vipButton.style.display !== 'none') {

            menuItems.push({
                text: 'Upgrade VIP',
                icon: '💎', // Mantendo o ícone original do botão VIP, mas o texto será 💰
                onClick: () => {
                    this.closeMenu();
                    setTimeout(() => this.vipButton.click(), 100);
                }
            });
        }

        // 4. Botão IA
        this.iaButton = document.getElementById('floating-ia-button');
        if (this.iaButton && this.iaButton.style.display !== 'none') {

            menuItems.push({
                text: 'IA', // Mantendo o texto original do botão IA, mas o ícone será 🧠
                icon: '🤖',
                onClick: () => {
                    this.closeMenu();
                    setTimeout(() => this.iaButton.click(), 100);
                }
            });
        }

        // 5. Botão Sair (sempre disponível)
        menuItems.push({
            text: 'Sair',
            icon: '🚪',
            onClick: () => {
                this.closeMenu();
                // Chamar as mesmas funções do logout existente
                setTimeout(() => {
                    if (typeof ModalLogout !== 'undefined') {
                        ModalLogout.show();
                    } else if (typeof SessionManager !== 'undefined' && typeof SessionManager.logout === 'function') {
                        SessionManager.logout();
                    } else {
                        // Fallback: tentar encontrar botão de logout existente
                        const logoutButton = document.querySelector('.logout-item') || document.querySelector('[onclick*="logout"]');
                        if (logoutButton) {
                            logoutButton.click();
                        } else {
                            alert('Função de logout não encontrada');
                        }
                    }
                }, 100);
            }
        });

        // Criar botões no menu
        menuItems.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = 'mobile-sidebar-item';

            // Aplicar estilo especial para o botão de logout
            if (item.text === 'Sair') {
                button.classList.add('logout-button');
                button.style.cssText += `
                    background: rgba(220, 53, 69, 0.2) !important;
                    border: 2px solid rgba(220, 53, 69, 0.5) !important;
                    margin-top: 10px !important;
                `;
            }

            // Lógica para definir o ícone e o texto corretos com base nas mudanças
            let displayIcon = item.icon;
            let displayText = item.text;

            if (item.text === 'IA') {
                displayIcon = '🧠'; // Novo ícone para IA
                displayText = 'IA'; // Mantém o texto original para IA
            } else if (item.text === 'Upgrade VIP') {
                displayIcon = '💰'; // Novo ícone para VIP
                displayText = 'VIP'; // Mantém o texto original para VIP
            }

            button.innerHTML = `
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <span class="menu-item-icon">${displayIcon}</span>
                        <span class="menu-item-title">${displayText}</span>
                    </div>
                </div>
            `;
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                item.onClick();
            });
            sidebarBody.appendChild(button);
        });

        if (menuItems.length > 0) {

        } else {

            // Adicionar item padrão se não há botões
            const defaultButton = document.createElement('button');
            defaultButton.className = 'mobile-sidebar-item';
            defaultButton.innerHTML = `
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <span class="menu-item-icon">ℹ️</span>
                        <span class="menu-item-title">Menu carregando...</span>
                    </div>
                </div>
            `;
            defaultButton.disabled = true;
            sidebarBody.appendChild(defaultButton);
        }
    }

    // 🔧 CRÍTICO: Garantir que elementos mobile existam sempre
    ensureMobileElementsExist() {
        // Verificar se estamos em mobile REAL (não apenas largura pequena)
        if (!this.isMobileDevice()) return;

        // Garantir que sidebar existe
        if (!document.getElementById('mobile-sidebar')) {

            const sidebar = document.createElement('div');
            sidebar.id = 'mobile-sidebar';
            sidebar.className = 'mobile-sidebar';
            sidebar.innerHTML = `
                <div class="mobile-sidebar-content">
                    <div class="mobile-sidebar-header">
                        <h2>Menu</h2>
                        <button id="mobile-sidebar-close" class="mobile-sidebar-close">×</button>
                    </div>
                    <div class="mobile-sidebar-body" id="mobile-sidebar-body">
                        <!-- Botões serão populados dinamicamente -->
                    </div>
                </div>
            `;
            document.body.appendChild(sidebar);
        }

        // Garantir que overlay existe
        if (!document.querySelector('.mobile-sidebar-overlay')) {

            const overlay = document.createElement('div');
            overlay.className = 'mobile-sidebar-overlay';
            document.body.appendChild(overlay);
        }

        // Garantir que header mobile existe
        if (!document.querySelector('.mobile-header')) {

            const header = document.createElement('div');
            header.className = 'mobile-header';
            header.innerHTML = `
                <button id="mobile-menu-toggle" class="mobile-menu-toggle">
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </button>
                <h1 class="mobile-header-title">Strategy Free</h1>
            `;
            document.body.insertBefore(header, document.body.firstChild);
        }
    }

    // 🔧 CRÍTICO: Forçar CSS nos elementos mobile (como header mobile funciona)
    forceMobileElementsCSS() {
        if (!this.isMobileDevice()) return;

        // Forçar CSS no header mobile
        const mobileHeader = document.querySelector('.mobile-header');
        if (mobileHeader) {
            mobileHeader.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100vw !important;
                height: 60px !important;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: white !important;
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 0 15px !important;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
                z-index: 2147483646 !important;
                box-sizing: border-box !important;
                pointer-events: auto !important;
                backdrop-filter: blur(10px) !important;
            `;
        }

        // Forçar CSS base na sidebar (fechada)
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar) {
            sidebar.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: -100% !important;
                width: 280px !important;
                max-width: 80vw !important;
                height: 100vh !important;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                z-index: 2147483647 !important;
                transition: left 0.3s ease !important;
                box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3) !important;
                overflow: hidden !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            `;
        }

        // Forçar CSS no overlay (escondido)
        const overlay = document.querySelector('.mobile-sidebar-overlay');
        if (overlay) {
            overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 2147483646 !important;
                display: none !important;
                opacity: 0 !important;
                pointer-events: auto !important;
                transition: opacity 0.3s ease !important;
            `;
        }

        // Garantir padding no body
        document.body.style.paddingTop = '60px';
    }

    // Método público para forçar repopulação do menu
    refreshMenu() {
        const sidebarBody = document.getElementById('mobile-sidebar-body');
        if (sidebarBody) {
            sidebarBody.innerHTML = ''; // Limpar conteúdo
        }
        this.populateMenu();
    }
}

// Criar instância global
window.mobileMenuManager = new MobileMenuManager();

// 🔧 GARANTIA ADICIONAL: Reinicializar se DOM mudar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.mobileMenuManager) {
            window.mobileMenuManager.setup();
        }
    }, 1000);
});

// Fim do arquivo JavaScript