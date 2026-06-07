# Relatório de Engenharia Reversa — ZeeK 3.0

## Resumo
ZeeK 3.0 é um **robô de trading automatizado (opções binárias) para a plataforma Deriv**,
escrito em **Python 3.13 + PySide6 (Qt)**, compilado para nativo com **Nuitka** e
distribuído num instalador **Inno Setup** (`ZeeK_Setup_1.10.0.exe`). Interface em português.

> O tutorial pyinstxtractor+pycdc NÃO se aplica: ele serve para apps PyInstaller (bytecode).
> ZeeK é Nuitka (código de máquina nativo) — não há `.pyc` para extrair/descompilar.

## Identificação do empacotamento
- `ZeeK.exe`: PE32+ x64, seção `.text` de ~19 MB, 90+ marcadores `NUITKA`, `__compiled__`, `onefile`.
- Sem `base_library.zip`/PYZ/`_internal` → confirma Nuitka, não PyInstaller.
- `.pyd`/DLLs soltos (PySide6, python313.dll) são módulos de extensão, não o código do app.

## Comportamento de rede (CONFIRMADO em captura ao vivo)
| Destino | Protocolo | Função | Frequência |
|---|---|---|---|
| `79.143.190.252:8765/api/v1/monitor/heartbeat` | HTTP puro | Telemetria | **a cada ~60s** |
| `79.143.190.252:8765/api/v1/license/validate` | HTTP puro | Validação de licença | ao ativar licença |
| `babutrader.com:443` | HTTPS | Config do fornecedor (`path.json`) | no startup |
| `wss://ws.derivws.com/websockets/v3` | WSS | API de trading Deriv (ordens) | em operação |
| `api.derivws.com` (app_id 24332) | HTTPS | API Deriv | — |

Cliente HTTP: `Python-urllib/3.13` (e aiohttp para a parte assíncrona).

### O heartbeat é telemetria/vigilância
A cada ~60s o app envia um JSON ao servidor do operador (que responde `{"ok":true,"stored":...}`
— ou seja, **armazena cada heartbeat**). Campos enviados:
```
instance_id, pid, status, token_hash (hash do token Deriv),
account_name, client_name, loginid,     <- identidade da conta Deriv
balance, currency, account_profit,       <- saldo e lucro do usuário
mini_meta_total, wins, losses, market, strategy, license_*
```
Com o usuário logado, esses campos vão preenchidos. O operador consegue ver, de cada usuário,
a identidade da conta, saldo, moeda, lucro e resultado das operações em tempo real.

### Pontos de risco
- Licença/telemetria em **HTTP sem criptografia** num **IP fixo (79.143.190.252)** — sujeito a MITM.
- **Token Deriv embutido no binário**: `33sFpz23WIVdEwS2SBTcX` (app_id 24332).
- Identificador de máquina salvo em `zeek_machine_id.txt`; dados protegidos com `cryptography` (Fernet/AES).

## Lógica do robô (reconstruída das constantes Nuitka)
- Estratégia **martingale/soros**: `initial_stake`, `multiplier_mode`, `soros_factor`,
  `take_profit`, `stop_mode/value/sequence`, `profit_per_win`, `mini_meta_*`.
- **Gestão** (money management), **Defesa**, modos `hunter`, `wave`, `focus`, `timer`.
- **Multimercado**: várias "páginas" simultâneas, cada uma com `barrier_sign/value` (condições de entrada).
- Mercado padrão observado: `R_100` (Volatility 100 Index), modo `CALL / PUT`.
- Setups salvos em `zeek_setups.json`; telemetria em `%AppData%\Roaming\ZeeK\zeek_monitor_data\`.

## Limite técnico encontrado
Decompilar as **funções** da matemática de trading no Ghidra é **inviável** neste binário:
o Nuitka serializa todas as constantes num blob comprimido no `.rsrc`, descompactado só em
runtime, e o código acessa por índice — **não há ligação estática string→função** (xrefs = 0).
A matemática exata do martingale só seria observável por MITM da WSS da Deriv durante operação real.

## Ferramentas usadas
- pefile/capstone (análise estática), Ghidra 12.1.2 headless + PyGhidra (decompilação),
  proxy HTTP próprio (captura dinâmica do heartbeat).
```
```
