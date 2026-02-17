
// js/views/history.js
// O SISTEMA DEVE SER 100% ISOLADO POR USUARIO

class HistoryView {
    static render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container '${containerId}' não encontrado para HistoryView`);
            return;
        }

              
        // Limpar container antes de renderizar
        container.innerHTML = '';
        
        // Renderizar o DisplayView no lugar do histórico
        try {
            DisplayView.render(containerId);
           
        } catch (error) {
            console.error(`❌ Erro ao renderizar DisplayView:`, error);
            container.innerHTML = '<div class="error-message">Erro ao carregar display de preços</div>';
        }
    }
}
