<div class="form-group-inline">
                        <label for="contract-select">Contrato:</label>
                        <select id="contract-select" class="form-control" onchange="ConfigurationsView.validateAndSaveDuration();"><option value="">Selecione um tipo de contrato</option><option value="DIGITOVER" data-group="Over/Under">Over/Under</option><option value="CALL" data-group="Rise/Fall">Rise/Fall</option><option value="DIGITDIFF" data-group="Differ/Match">Differ/Match</option><option value="DIGITEVEN" data-group="Even/Odd">Even/Odd</option></select>
                    </div>



<div class="form-group-inline">
                        <label for="trade-type-select">Tipo Trade:</label>
                        <select id="trade-type-select" class="form-control" onchange="ConfigurationsView.saveCurrentConfiguration();"><option value="">Selecione o tipo</option><option value="DIGITDIFF">Differ</option><option value="DIGITMATCH">Match</option><option value="BOTH">Ambos</option></select>
                    </div>
