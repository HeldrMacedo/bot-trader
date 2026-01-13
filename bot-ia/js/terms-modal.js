// js/terms-modal.js
// Sistema de Termos de Uso Obrigatório
// Bloqueio total até aceitação - Registro no servidor

class TermsModal {
    static isShowing = false;
    static modalElement = null;
    static CURRENT_TERMS_VERSION = '1.1'; // 🆙 Atualizado para forçar novo aceite

    /**
     * Verificar se usuário já aceitou termos (consulta servidor)
     */
    static async hasAcceptedTerms(loginId) {
        try {
            if (!loginId) {
                console.error('❌ [TERMS] LoginId não fornecido');
                return false;
            }

            // 1. Verificar LocalStorage primeiro (mais rápido e fallback)
            const localTerms = localStorage.getItem(`terms_accepted_${loginId}`);
            if (localTerms) {
                try {
                    const parsed = JSON.parse(localTerms);
                    if (parsed.accepted && parsed.version === this.CURRENT_TERMS_VERSION) {
                      
                        return true;
                    }
                } catch (e) {
                    console.warn('⚠️ [TERMS] Erro ao ler termos locais:', e);
                }
            }

          
            const response = await fetch(`/api/terms-status/${loginId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
             

                // 🔒 Verificar se aceitou E se é a versão atual
                if (data.termsAccepted && data.version === this.CURRENT_TERMS_VERSION) {
                    return true;
                }

                if (data.termsAccepted) {
                    console.warn(`⚠️ [TERMS] Versão antiga detectada (${data.version}). Necessário aceitar v${this.CURRENT_TERMS_VERSION}`);
                }

                return false;
            }

            console.warn('⚠️ [TERMS] Erro ao verificar termos no servidor');
            return false;
        } catch (error) {
            console.error('❌ [TERMS] Erro ao verificar termos:', error);
            return false;
        }
    }

    /**
     * Mostrar modal de termos (bloqueio total)
     * Retorna Promise que resolve quando usuário aceitar
     */
    static async showTermsModal(loginId) {
        return new Promise((resolve, reject) => {
            if (this.isShowing) {
                console.warn('⚠️ [TERMS] Modal já está sendo exibido');
                return resolve(false);
            }

            this.isShowing = true;
         
            // Criar elementos do modal
            this.createModalElements(loginId, resolve, reject);

            // Mostrar modal
            setTimeout(() => {
                if (this.modalElement) {
                    this.modalElement.style.opacity = '1';
                    const content = this.modalElement.querySelector('.terms-modal-content');
                    if (content) {
                        content.style.transform = 'scale(1)';
                    }
                }
            }, 100);
        });
    }

    /**
     * Criar elementos visuais do modal
     */
    static createModalElements(loginId, resolve, reject) {
        // Remover modal anterior se existir
        const existing = document.getElementById('terms-modal');
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'terms-modal';
        modal.className = 'terms-modal';

        // Estilos inline para máxima prioridade
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.95) !important;
            z-index: 2147483647 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
            overflow-y: auto !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;

        modal.innerHTML = `
            <div class="terms-modal-content" style="
                background: white !important;
                border-radius: 20px !important;
                max-width: 800px !important;
                width: 100% !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
                transform: scale(0.9) !important;
                transition: transform 0.3s ease !important;
            ">
                <div class="terms-modal-header" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    padding: 30px !important;
                    border-radius: 20px 20px 0 0 !important;
                    text-align: center !important;
                ">
                    <h2 style="margin: 0 0 10px 0 !important; font-size: 1.8em !important;">📜 Termos e Condições de Uso</h2>
                    <p style="margin: 0 !important; opacity: 0.95 !important; font-size: 0.95em !important;">
                        Para continuar, você deve aceitar nossos termos de uso
                    </p>
                </div>

                <style>
                    .terms-modal-body h4 {
                        margin: 15px 0 5px 0 !important;
                        color: #2d3748;
                        font-size: 1.1em;
                    }
                    .terms-modal-body p {
                        margin: 0 0 10px 0 !important;
                    }
                    .terms-modal-body ul {
                        margin: 0 0 10px 0 !important;
                        padding-left: 20px;
                    }
                    .terms-modal-body li {
                        margin-bottom: 5px;
                    }
                </style>
                <div class="terms-modal-body" style="
                    padding: 30px !important;
                    font-size: 0.85em !important;
                    line-height: 1.5 !important;
                    color: #333 !important;
                    text-align: justify !important;
                    max-height: 50vh !important;
                    overflow-y: auto !important;
                ">
                    <h3 style="color: #667eea; margin-top: 0;">TERMOS E CONDIÇÕES DE USO – strategyfree.com</h3>

                    <!-- DISCLAIMER DE RISCO -->
                    <div style="
                        background: #fee2e2;
                        border-left: 4px solid #dc2626;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 5px;
                    ">
                        <strong style="color: #dc2626; font-size: 1.1em;">⚠️ AVISO DE RISCO IMPORTANTE</strong>
                        <p style="margin: 10px 0 0 0; font-weight: 500;">
                            Trading de contratos por diferença (CFDs) e derivativos envolve <strong>ALTO RISCO DE PERDA</strong>. 
                            Você pode perder <strong>TODO o capital investido</strong>. Não invista dinheiro que você não pode perder.
                        </p>
                    </div>

                    <h4>​1. ISENÇÃO DE CONSULTORIA FINANCEIRA</h4>
                    <p>O utilizador declara ter ciência de que o site strategyfree.com e seu Desenvolvedor não são consultores de investimentos, analistas de valores mobiliários ou instituições financeiras.</p>
                    <ul>
                        <li>​A plataforma não realiza gestão de custódia;</li>
                        <li>​Não há promessa de rentabilidade ou ganhos fixos;</li>
                        <li>​O utilizador é o único responsável pelas configurações de risco e pela decisão de operar.</li>
                    </ul>

                    <h4>​2. RISCO DE OPERAÇÃO E MERCADO</h4>
                    <p>O trading em ativos financeiros e índices sintéticos envolve <strong>alto risco de perda de capital</strong>. O site strategyfree.com e seu Desenvolvedor não se responsabilizam por perdas financeiras decorrentes de estratégias configuradas ou variações de mercado.</p>

                    <h4>​3. INTEGRAÇÃO COM TERCEIROS (API DERIV)</h4>
                    <p>A plataforma funciona via integração com a API da <strong>Deriv.com</strong>. O site strategyfree.com e seu Desenvolvedor não se responsabilizam por falhas técnicas, latência ou mudanças de política da corretora que possam afetar o funcionamento dos robôs.</p>


                    <h4>​4. NATUREZA EDUCACIONAL E EXPERIMENTAL</h4>
                    <p>Esta plataforma possui <strong>caráter educacional e experimental</strong>. O utilizador declara:</p>
                    <ul>
                        <li>Compreender que ferramentas de automação não garantem lucros;</li>
                        <li>Ter conhecimento sobre os riscos de trading automatizado;</li>
                        <li>Utilizar a plataforma apenas com capital que pode perder sem comprometer sua situação financeira;</li>
                        <li>Não considerar esta ferramenta como assessoria de investimentos ou promessa de rentabilidade;</li>
                        <li>Reconhecer que resultados passados não garantem resultados futuros.</li>
                    </ul>

                    <h4>​5. AUSÊNCIA DE GARANTIAS</h4>
                    <p>O site strategyfree.com e seu Desenvolvedor <strong>NÃO garante</strong>:</p>
                    <ul>
                        <li>Disponibilidade ininterrupta do serviço (uptime 100%);</li>
                        <li>Ausência de bugs, falhas ou erros técnicos;</li>
                        <li>Compatibilidade futura com atualizações da API Deriv.com;</li>
                        <li>Manutenção indefinida da plataforma;</li>
                        <li>Suporte técnico em tempo real ou prazo determinado;</li>
                        <li>Que a plataforma atenderá às expectativas específicas de cada utilizador.</li>
                    </ul>

                    <h4>​6. PROTEÇÃO DE DADOS E PRIVACIDADE</h4>
                    <p>Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</strong>:</p>
                    <ul>
                        <li>Os dados de acesso (tokens API) são armazenados de forma criptografada;</li>
                        <li>O Desenvolvedor não tem acesso a senhas ou dados sensíveis da conta Deriv.com;</li>
                        <li>Dados de utilização podem ser coletados para fins de melhoria do sistema;</li>
                        <li>O Desenvolvedor não compartilha dados pessoais com terceiros, exceto quando exigido por lei;</li>
                        <li>O utilizador pode solicitar exclusão de seus dados a qualquer momento;</li>
                        <li>Logs de trading são armazenados apenas localmente no navegador do utilizador.</li>
                    </ul>

                    <h4>​7. VEDAÇÕES E USO ADEQUADO</h4>
                    <p>É <strong>expressamente proibido</strong>:</p>
                    <ul>
                        <li>Utilizar a plataforma para lavagem de dinheiro ou atividades ilícitas;</li>
                        <li>Realizar engenharia reversa, cópia ou distribuição do código-fonte;</li>
                        <li>Comercializar, revender ou sublicenciar acesso à plataforma sem autorização;</li>
                        <li>Utilizar a plataforma para criar serviços concorrentes;</li>
                        <li>Manipular ou tentar burlar sistemas de créditos ou limitações de uso;</li>
                        <li>Fornecer acesso à plataforma a menores de 18 anos;</li>
                        <li>Utilizar a plataforma em países onde trading de derivativos seja proibido.</li>
                    </ul>

                    <h4>​8. FORO E LEGISLAÇÃO APLICÁVEL</h4>
                    <p>Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o <strong>foro da comarca de Porto Alegre/RS</strong> para dirimir quaisquer controvérsias oriundas deste contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>

                    <h4>​9. CANAL DE COMUNICAÇÃO OFICIAL</h4>
                    <p>O único canal oficial de suporte e comunicação é:</p>
                    <ul>
                        <li>E-mail de suporte: <strong>strategyfree@gmail.com</strong></li>
                        <li>Prazo de resposta: até 5 dias úteis (sem garantia de prazo fixo)</li>
                    </ul>
                    <p>O Desenvolvedor não se responsabiliza por comunicações realizadas através de canais não oficiais, redes sociais ou terceiros não autorizados.</p>

                    <h4>​10. JURISDIÇÃO E REGISTRO DA CORRETORA</h4>
                    <p>A Deriv.com é uma corretora internacional não registrada na Comissão de Valores Mobiliários (CVM) do Brasil. O utilizador confirma ter ciência de que:</p>
                    <ul>
                        <li>A plataforma Deriv.com opera sob jurisdição estrangeira;</li>
                        <li>O Desenvolvedor não possui qualquer vínculo, controle ou responsabilidade sobre a Deriv.com;</li>
                        <li>Eventuais litígios ou problemas com a corretora devem ser tratados diretamente com a Deriv.com;</li>
                        <li>O Desenvolvedor não se responsabiliza por questões regulatórias, bloqueios, mudanças de política ou qualquer ação da Deriv.com que afete o acesso ou funcionamento dos serviços.</li>
                    </ul>

                    <h4>​11. COMISSIONAMENTO E MANUTENÇÃO</h4>
                    <p>O utilizador reconhece e aceita que o Desenvolvedor, na qualidade de parceiro da plataforma Deriv.com, poderá receber comissões baseadas no volume de operações realizadas. O utilizador declara estar ciente de que as taxas de retorno (payout) e spreads podem ser ajustados para viabilizar o fornecimento, a manutenção técnica e o suporte das ferramentas oferecidas neste site, constituindo a remuneração pelo serviço prestado pelo Desenvolvedor..</p>

                    <h4>​12. PROPRIEDADE INTELECTUAL</h4>
                    <p>Os algoritmos são de propriedade intelectual do Desenvolvedor. É <strong>proibida</strong> qualquer cópia ou redistribuição sem autorização.</p>

                    <h4>​13. NATUREZA DO SERVIÇO</h4>
                    <p>O site <strong>https://strategyfree.com</strong> e as suas ferramentas de automação são de propriedade e responsabilidade de <strong>Daniel de Mello Raibolt</strong>, atuando como desenvolvedor independente pessoa física. Esta plataforma é exclusivamente uma ferramenta de tecnologia e licenciamento de software.</p>

                    <h4>​14. LIMITAÇÃO DE RESPONSABILIDADE</h4>
                    <p>O Desenvolvedor, atuando como pessoa física, fornece esta ferramenta "NO ESTADO EM QUE SE ENCONTRA" (AS IS), sem garantias de qualquer natureza. O utilizador concorda que:</p>
                    <ul>
                        <li>O Desenvolvedor <strong>NÃO é responsável</strong> por perdas financeiras, lucros cessantes ou danos indiretos;</li>
                        <li>A responsabilidade máxima do Desenvolvedor está <strong>limitada ao valor pago</strong> pelo utilizador nos últimos 30 dias;</li>
                        <li>Em caso de mau funcionamento, bugs ou erros, o Desenvolvedor se compromete apenas a corrigir o problema técnico, sem compensações financeiras;</li>
                        <li>O utilizador é o único responsável por configurar limites de perda (stop loss) e gerenciar seu capital.</li>
                    </ul>

                    <h4>​15. ACEITAÇÃO POR CONDUTA E SEGURANÇA EXTRA</h4>
                    <p>Ao clicar em <strong>"Aceitar"</strong> ou ao conectar a sua API, o utilizador confirma a leitura integral destes termos. O uso continuado desta plataforma, após a exibição do aviso de termos e riscos, constitui aceitação integral e irrevogável de todas as cláusulas aqui presentes.</p>

                    <div style="
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 5px;
                    ">
                        <strong>⚠️ CONFIRMAÇÃO FINAL:</strong> Ao aceitar estes termos, você reconhece que entende todos os riscos envolvidos no trading automatizado, que é maior de 18 anos, e que é o único responsável por suas decisões de investimento.
                    </div>

                    <p style="text-align: center; color: #666; font-size: 0.85em; margin-top: 20px;">
                        <strong>Versão 2.0 - Janeiro 2026</strong><br>
                        strategyfree.com - Desenvolvido por Daniel de Mello Raibolt
                    </p>
                </div>

                <div class="terms-modal-footer" style="
                    padding: 20px 30px 30px 30px !important;
                    display: flex !important;
                    justify-content: center !important;
                ">
                    <button id="accept-terms-btn" class="accept-terms-btn" style="
                        background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
                        color: white !important;
                        border: none !important;
                        padding: 15px 40px !important;
                        border-radius: 10px !important;
                        font-size: 1.1em !important;
                        font-weight: 600 !important;
                        cursor: pointer !important;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
                        transition: all 0.3s ease !important;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(16, 185, 129, 0.3)'">
                        ✅ Aceitar Termos de Uso
                    </button>
                </div>
            </div>
        `;

        // Adicionar ao body
        document.body.appendChild(modal);
        this.modalElement = modal;

        // Prevenir fechamento com ESC
        const preventEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
              
            }
        };

        document.addEventListener('keydown', preventEscape, { capture: true });

        // Prevenir fechamento clicando fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
              
                // Animação de "shake" para indicar que não pode fechar
                const content = modal.querySelector('.terms-modal-content');
                if (content) {
                    content.style.animation = 'shake 0.5s';
                    setTimeout(() => {
                        content.style.animation = '';
                    }, 500);
                }
            }
        });

        // Botão de aceitar
        const acceptBtn = modal.querySelector('#accept-terms-btn');
        acceptBtn.addEventListener('click', async () => {
          
            acceptBtn.disabled = true;
            acceptBtn.textContent = '⏳ Processando...';

            try {
                const accepted = await this.acceptTerms(loginId);

                if (accepted) {
                
                    // Animação de fade out
                    modal.style.opacity = '0';

                    setTimeout(() => {
                        modal.remove();
                        this.modalElement = null;
                        this.isShowing = false;
                        document.removeEventListener('keydown', preventEscape, { capture: true });
                        resolve(true);
                    }, 300);
                } else {
                    throw new Error('Falha ao aceitar termos');
                }
            } catch (error) {
                console.error('❌ [TERMS] Erro ao aceitar termos:', error);
                acceptBtn.disabled = false;
                acceptBtn.textContent = '❌ Erro - Tente Novamente';
                acceptBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

                setTimeout(() => {
                    acceptBtn.textContent = '✅ Aceitar Termos de Uso';
                    acceptBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
                }, 3000);
            }
        });

        // Adicionar CSS de animação shake
        if (!document.getElementById('terms-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'terms-modal-styles';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: scale(1) translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: scale(1) translateX(-10px); }
                    20%, 40%, 60%, 80% { transform: scale(1) translateX(10px); }
                }

                .terms-modal-body::-webkit-scrollbar {
                    width: 8px;
                }

                .terms-modal-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }

                .terms-modal-body::-webkit-scrollbar-thumb {
                    background: #667eea;
                    border-radius: 10px;
                }

                .terms-modal-body::-webkit-scrollbar-thumb:hover {
                    background: #764ba2;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Registrar aceitação no servidor
     */
    static async acceptTerms(loginId) {
        try {
          
            const response = await fetch('/api/accept-terms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loginId: loginId,
                    acceptedAt: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    ipAddress: 'client', // IP será obtido no servidor
                    version: this.CURRENT_TERMS_VERSION, // ✅ Versão atual
                    platform: 'strategyfree.com'
                })
            });

            const responseText = await response.text();
            let data;

            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('❌ [TERMS] Resposta inválida do servidor:', responseText);
                throw new Error(`Resposta do servidor não é JSON válido: ${responseText.substring(0, 50)}...`);
            }

            if (response.ok) {
              
                // Também salvar localmente por via das dúvidas
                localStorage.setItem(`terms_accepted_${loginId}`, JSON.stringify({
                    accepted: true,
                    version: this.CURRENT_TERMS_VERSION,
                    date: new Date().toISOString()
                }));
                return true;
            } else {
                console.error('❌ [TERMS] Erro ao aceitar termos no servidor:', data);
                throw new Error('Falha no servidor');
            }
        } catch (error) {
            console.warn('⚠️ [TERMS] Falha ao conectar com servidor. Usando fallback local:', error.message);

            // FALLBACK: Salvar no LocalStorage para não bloquear usuário
            try {
                const termsData = {
                    accepted: true,
                    version: this.CURRENT_TERMS_VERSION,
                    date: new Date().toISOString(),
                    savedLocally: true
                };
                localStorage.setItem(`terms_accepted_${loginId}`, JSON.stringify(termsData));
              
                return true;
            } catch (localError) {
                console.error('❌ [TERMS] Erro fatal ao salvar localmente:', localError);
                return false;
            }
        }
    }
}

// Exportar para uso global
window.TermsModal = TermsModal;
