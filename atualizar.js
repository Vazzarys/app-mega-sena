const fs = require('fs');
const axios = require('axios');
const XLSX = require('xlsx');

const url = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/resultados/download?modalidade=Mega-Sena';
const arquivoExcel = 'Mega-Sena.xlsx';
const arquivoJson = 'resultados.json';

async function downloadEConverter() {
    console.log('1. Iniciando download da planilha da Caixa...');
    
    try {
        // Baixa o arquivo simulando um navegador para não ser bloqueado
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Salva o arquivo Excel temporariamente
        fs.writeFileSync(arquivoExcel, response.data);
        console.log('   Download concluído!');

        console.log('2. Lendo e convertendo dados...');
        const workbook = XLSX.read(response.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converte para JSON bruto
        const dadosBrutos = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "A1:T5000", defval: "" });
        const resultados = [];

        // Processa as linhas (mesma lógica do seu conversor.html)
        for (let i = 1; i < dadosBrutos.length; i++) {
            const linha = dadosBrutos[i];
            const concurso = parseInt(linha[0]);

            if (!isNaN(concurso) && concurso > 0) {
                // Trata a data
                let dataFormatada = linha[1];
                if (typeof linha[1] === 'number') {
                    const dateObj = new Date(Math.round((linha[1] - 25569) * 86400 * 1000));
                    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
                    dataFormatada = dateObj.toLocaleDateString('pt-BR');
                }

                // Pega as dezenas (colunas C a H)
                if (linha[2] != undefined) {
                    const dezenas = [
                        fmt(linha[2]), fmt(linha[3]), fmt(linha[4]),
                        fmt(linha[5]), fmt(linha[6]), fmt(linha[7])
                    ];
                    
                    resultados.push({ concurso, data: dataFormatada, dezenas });
                }
            }
        }

        // Salva o novo JSON
        fs.writeFileSync(arquivoJson, JSON.stringify(resultados));
        console.log(`3. Sucesso! ${resultados.length} jogos salvos em ${arquivoJson}`);

    } catch (erro) {
        console.error('Erro fatal:', erro.message);
        process.exit(1); // Encerra com erro para o GitHub avisar
    }
}

function fmt(val) {
    return String(val).trim().padStart(2, '0');
}

downloadEConverter();