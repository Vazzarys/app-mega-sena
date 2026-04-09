const fs = require('fs');
const axios = require('axios');

const arquivoJson = 'resultados.json';

const URLS = [
  'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena',
  'https://servicebus2.caixa.gov.br/portaldeloterias/api/home/ultimos-resultados'
];

async function obterResultadoAtual() {
  for (const url of URLS) {
    try {
      console.log(`Tentando consultar: ${url}`);

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      const data = response.data;

      // Endpoint direto da Mega-Sena
      if (data && (data.numero || data.numeroDoConcurso) && (data.listaDezenas || data.dezenas)) {
        return normalizarResultado(data);
      }

      // Endpoint "home/ultimos-resultados"
      if (data && data.megasena) {
        return normalizarResultado(data.megasena);
      }
    } catch (erro) {
      console.warn(`Falha ao consultar ${url}: ${erro.message}`);
    }
  }

  throw new Error('Não foi possível obter o resultado atual da Mega-Sena na API da CAIXA.');
}

function normalizarResultado(data) {
  const concurso = Number(data.numero || data.numeroDoConcurso);
  const dataApuracao = data.dataApuracao || '';
  const dezenasOriginais = data.listaDezenas || data.dezenas || [];

  if (!concurso || !Array.isArray(dezenasOriginais) || dezenasOriginais.length < 6) {
    throw new Error('Resposta da API veio incompleta ou em formato inesperado.');
  }

  const dezenas = dezenasOriginais
    .slice(0, 6)
    .map((n) => String(n).trim().padStart(2, '0'))
    .sort((a, b) => Number(a) - Number(b));

  return {
    concurso,
    data: dataApuracao,
    dezenas
  };
}

function carregarHistorico() {
  if (!fs.existsSync(arquivoJson)) {
    return [];
  }

  try {
    const conteudo = fs.readFileSync(arquivoJson, 'utf8');
    const dados = JSON.parse(conteudo);

    if (!Array.isArray(dados)) {
      throw new Error('resultados.json não contém um array válido.');
    }

    return dados;
  } catch (erro) {
    throw new Error(`Erro ao ler ${arquivoJson}: ${erro.message}`);
  }
}

function salvarHistorico(dados) {
  fs.writeFileSync(arquivoJson, JSON.stringify(dados, null, 2), 'utf8');
}

async function atualizarResultados() {
  try {
    console.log('1. Carregando histórico atual...');
    const historico = carregarHistorico();
    console.log(`   ${historico.length} concursos encontrados no arquivo local.`);

    console.log('2. Consultando resultado mais recente na API da CAIXA...');
    const novoResultado = await obterResultadoAtual();
    console.log(
      `   Concurso ${novoResultado.concurso} encontrado: ${novoResultado.dezenas.join(' ')}`
    );

    const indiceExistente = historico.findIndex(
      (item) => Number(item.concurso) === Number(novoResultado.concurso)
    );

    if (indiceExistente >= 0) {
      historico[indiceExistente] = novoResultado;
      console.log(`3. Concurso ${novoResultado.concurso} já existia e foi atualizado.`);
    } else {
      historico.push(novoResultado);
      console.log(`3. Concurso ${novoResultado.concurso} adicionado ao histórico.`);
    }

    historico.sort((a, b) => Number(a.concurso) - Number(b.concurso));

    salvarHistorico(historico);
    console.log(`4. Arquivo ${arquivoJson} salvo com sucesso.`);
  } catch (erro) {
    console.error('Erro fatal:', erro.message);
    process.exit(1);
  }
}

atualizarResultados();