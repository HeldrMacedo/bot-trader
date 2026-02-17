/**
 * Sistema de Tooltips Premium (Balloons)
 * Versão 1.7 - ULTRA PERFORMANCE (On-Demand Logic)
 * Otimizado para não gerar lag em trades rápidos.
 */
(function () {
    'use strict';

    if (window.__PREMIUM_TOOLTIP_LOADED_V17__) return;
    window.__PREMIUM_TOOLTIP_LOADED_V17__ = true;


    // 1. Injetar estilos apenas UMA VEZ
    if (!document.getElementById('premium-tooltip-styles')) {
        const style = document.createElement('style');
        style.id = 'premium-tooltip-styles';
        style.textContent = `
            .premium-tooltip-v15 {
                position: fixed;
                z-index: 2147483647;
                background: rgba(255, 255, 255, 0.98);
                border: 1px solid rgba(0,0,0,0.1);
                color: #111;
                padding: 10px 14px;
                border-radius: 8px;
                font-size: 13px;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                font-weight: 500;
                pointer-events: none;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transform: scale(0.95) translateY(10px);
                transition: opacity 0.1s ease, transform 0.1s ease;
                max-width: 300px;
                text-align: center;
                line-height: 1.4;
                visibility: hidden;
                will-change: transform, opacity;
            }
            .premium-tooltip-v15.visible {
                opacity: 1;
                visibility: visible;
                transform: scale(1) translateY(0);
            }
            .premium-tooltip-v15::after {
                content: '';
                position: absolute;
                border: 6px solid transparent;
            }
            .premium-tooltip-v15.pos-top::after {
                bottom: -12px;
                left: 50%;
                margin-left: -6px;
                border-top-color: rgba(255, 255, 255, 0.98);
            }
            .premium-tooltip-v15.pos-bottom::after {
                top: -12px;
                left: 50%;
                margin-left: -6px;
                border-bottom-color: rgba(255, 255, 255, 0.98);
            }
        `;
        document.head.appendChild(style);
    }

    let tooltip = null;
    let activeElement = null;

    function createTooltip() {
        if (tooltip) return tooltip;
        tooltip = document.createElement('div');
        tooltip.className = 'premium-tooltip-v15';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function updatePosition() {
        if (!activeElement || !tooltip) return;

        const rect = activeElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = rect.top - tooltipRect.height - 12;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        tooltip.classList.remove('pos-top', 'pos-bottom');

        if (top < 15) {
            top = rect.bottom + 12;
            tooltip.classList.add('pos-bottom');
        } else {
            tooltip.classList.add('pos-top');
        }

        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    function handleInteraction(e) {
        if (e.type === 'mouseover') {
            const target = e.target.closest?.('[title], [data-tooltip]');
            if (!target) return;

            // Converter title para data-tooltip apenas se necessário (Lazy Migration)
            const title = target.getAttribute('title');
            if (title) {
                target.setAttribute('data-tooltip', title);
                target.removeAttribute('title');
            }

            const text = target.getAttribute('data-tooltip');
            if (!text || text.trim() === '' || activeElement === target) return;

            activeElement = target;
            const el = createTooltip();
            el.textContent = text;

            // Posicionar ANTES de mostrar para evitar pulo visual
            updatePosition();

            requestAnimationFrame(() => {
                if (activeElement === target) el.classList.add('visible');
            });

        } else if (e.type === 'mouseout') {
            if (activeElement && !activeElement.contains(e.relatedTarget)) {
                hideTooltip();
            }
        }
    }

    function hideTooltip() {
        if (tooltip) tooltip.classList.remove('visible');
        activeElement = null;
    }

    // Eventos leves
    document.addEventListener('mouseover', handleInteraction, { passive: true });
    document.addEventListener('mouseout', handleInteraction, { passive: true });
    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip, { passive: true });
})();
