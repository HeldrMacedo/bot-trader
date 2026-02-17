// Adiciona botão de tutorial do YouTube ao componente de probabilidade
(function () {
   
    const VIDEO_ID = '0vvufzBdNzk';

    // 🚀 IMPLEMENTAÇÃO DE MODAL (Sobrescreve qualquer modal problemático do sistema)
    window.VideoTutorialModal = {
        show: function (input) {
           
            // Se o input for apenas o ID, converter para URL
            let embedUrl = input;
            if (!input.includes('://')) {
                embedUrl = `https://www.youtube-nocookie.com/embed/${input}?autoplay=1&rel=0`;
            } else {
                embedUrl = embedUrl.replace(/[?&]mute=1/, '');

                // Corrigir possível corrupção de URL
                const parts = embedUrl.split('?');
                if (parts.length > 2) {
                    embedUrl = parts[0] + '?' + parts[1] + '&' + parts.slice(2).join('&').replace(/\?/g, '&');
                }
            }

            const modalId = 'custom-video-modal-v3';
            if (document.getElementById(modalId)) document.getElementById(modalId).remove();

            const modal = document.createElement('div');
            modal.id = modalId;
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: transparent;
                z-index: 2147483647; display: flex; justify-content: center; align-items: center;
                animation: modalFadeIn 0.3s ease-out;
            `;
            modal.onclick = () => modal.remove();

            const style = document.createElement('style');
            style.textContent = `
                @keyframes modalFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .v3-video-container { 
                    position: relative; width: 90%; max-width: 1000px; aspect-ratio: 16/9; 
                    background: #000; border-radius: 12px; overflow: hidden;
                    box-shadow: 0 0 40px rgba(255, 0, 0, 0.4);
                    border: 3px solid #ff0000;
                }
                .v3-close-btn {
                    position: absolute; top: 15px; right: 15px; width: 36px; height: 36px;
                    border-radius: 50%; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.2);
                    color: #fff; cursor: pointer; font-size: 24px; display: flex; align-items: center;
                    justify-content: center; transition: all 0.2s; z-index: 100;
                }
                .v3-close-btn:hover { background: #ff0000; transform: scale(1.1); }
                .v3-footer {
                    position: absolute; bottom: 0; left: 0; width: 100%; padding: 12px 20px;
                    background: linear-gradient(transparent, rgba(0,0,0,0.9));
                    display: flex; justify-content: space-between; align-items: center;
                    color: rgba(255,255,255,0.7); font-family: sans-serif; font-size: 12px;
                    pointer-events: none;
                }
                .v3-link { color: #ff0000; text-decoration: none; font-weight: bold; pointer-events: auto; }
                .v3-link:hover { text-decoration: underline; color: #ff4d4d; }
            `;
            document.head.appendChild(style);

            const container = document.createElement('div');
            container.className = 'v3-video-container';
            container.onclick = (e) => e.stopPropagation();

            const close = document.createElement('button');
            close.className = 'v3-close-btn';
            close.innerHTML = '×';
            close.onclick = () => modal.remove();

            const iframe = document.createElement('iframe');
            iframe.src = embedUrl;
            iframe.style.cssText = `width: 100%; height: 100%; border: none;`;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;

            const footer = document.createElement('div');
            footer.className = 'v3-footer';
            footer.innerHTML = `
                <span>Tutorial: ${VIDEO_ID}</span>
                <a href="https://www.youtube.com/watch?v=${VIDEO_ID}" target="_blank" class="v3-link">YouTube ↗</a>
            `;

            container.appendChild(close);
            container.appendChild(iframe);
            container.appendChild(footer);
            modal.appendChild(container);
            document.body.appendChild(modal);
        }
    };

    function addTutorialButton() {
        const container = document.querySelector('.probability-monitor-block') ||
            document.querySelector('.probability-container') ||
            document.querySelector('.digit-probability-container');

        if (!container) {
            setTimeout(addTutorialButton, 1000);
            return;
        }

        if (document.getElementById('prob-tutorial-btn')) return;

        const button = document.createElement('button');
        button.id = 'prob-tutorial-btn';
        button.title = 'Ver Tutorial em Vídeo';

        button.style.cssText = `
            position: absolute; top: 6px; left: 6px;
            background: transparent; border: none;
            border-radius: 4px; width: 22px; height: 22px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s ease; z-index: 100;
            padding: 0; opacity: 0.7;
        `;

        const img = document.createElement('img');
        img.src = 'media/youtube-btn.png';
        img.style.cssText = `width: 75%; height: 75%; object-fit: contain;`;
        button.appendChild(img);

        button.onmouseover = () => { button.style.transform = 'scale(1.2)'; button.style.opacity = '1'; };
        button.onmouseout = () => { button.style.transform = 'scale(1)'; button.style.opacity = '0.7'; };

        button.onclick = function (e) {
            e.preventDefault(); e.stopPropagation();
            window.VideoTutorialModal.show(VIDEO_ID);
        };

        if (window.getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(button);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addTutorialButton);
    } else {
        addTutorialButton();
    }

    const observer = new MutationObserver(() => {
        if (!document.getElementById('prob-tutorial-btn')) {
            addTutorialButton();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
