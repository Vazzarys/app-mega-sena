// Seleciona os elementos da tela
const inputs = document.querySelectorAll('.numero-input');
const btnConferir = document.getElementById('btn-conferir');
const resultadoArea = document.getElementById('resultado');

// Variável global para guardar os jogos na memória
// Vamos usar window.dadosMega para garantir que todos acessem
window.dadosMega = null; 

// --- 1. Configuração dos Campos e Carregamento Inicial ---

window.addEventListener('load', async () => {
    inputs[0].focus();
    
    // OTIMIZAÇÃO: Baixa os dados assim que a página abre
    try {
        const resposta = await fetch('resultados.json');
        window.dadosMega = await resposta.json(); // <--- CORREÇÃO AQUI
        console.log("Banco de dados carregado com sucesso!");
    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        alert("Erro ao carregar os resultados. Verifique sua conexão.");
    }
});

inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        // 1. Remove qualquer coisa que não seja número
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        
        // 2. NOVA VALIDAÇÃO: Impede números maiores que 60
        const valorDigitado = parseInt(e.target.value);
        
        if (valorDigitado > 60) {
            alert("Atenção: Na Mega Sena os números vão apenas até 60.");
            e.target.value = ""; // Limpa o campo errado
            return;
        }

        // 3. Pula para o próximo campo se digitar 2 números
        if (e.target.value.length === 2) {
            // Verifica se digitou "00" (que não existe)
            if (valorDigitado === 0) {
                alert("O número 00 não existe na Mega Sena. Começa no 01.");
                e.target.value = "";
                return;
            }

            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        }
    });

    // Permite voltar com o Backspace
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '') {
            if (index > 0) {
                inputs[index - 1].focus();
            }
        }
    });
});

// --- 2. Lógica de Conferência ---

btnConferir.addEventListener('click', () => {
    const numerosUsuario = [];
    let camposVazios = false;
    let numeroInvalido = false;

    inputs.forEach(input => {
        if (input.value === '') camposVazios = true;
        
        // Converte para verificar se é válido (1 a 60)
        const valor = parseInt(input.value);
        if (valor < 1 || valor > 60) numeroInvalido = true;

        // Adiciona o número formatado (ex: "5" vira "05")
        numerosUsuario.push(input.value.padStart(2, '0'));
    });

    // Validações Finais
    if (camposVazios) {
        alert("Por favor, preencha todos os 6 números.");
        return;
    }

    if (numeroInvalido) {
        alert("Existem números inválidos. Use apenas de 01 a 60.");
        return;
    }

    // Validação de Repetidos
    const numerosUnicos = new Set(numerosUsuario);
    if (numerosUnicos.size !== numerosUsuario.length) {
        alert("Não é permitido repetir números na mesma aposta.");
        return;
    }

    // Verifica se o banco já carregou
    if (!window.dadosMega) {
        alert("Os dados ainda estão carregando... aguarde um instante e tente novamente.");
        return;
    }

    // Executa a conferência
    realizarConferencia(numerosUsuario, window.dadosMega);
});

function realizarConferencia(meusNumeros, todosResultados) {
    let senaEncontrada = null;
    let quinas = [];
    let quadras = [];
    let ternos = [];

    // Ordena visualmente
    meusNumeros.sort((a, b) => a - b);

    todosResultados.forEach(sorteio => {
        const acertos = meusNumeros.filter(num => sorteio.dezenas.includes(num));
        const qtdAcertos = acertos.length;

        if (qtdAcertos === 6) senaEncontrada = sorteio;
        else if (qtdAcertos === 5) quinas.push(sorteio);
        else if (qtdAcertos === 4) quadras.push(sorteio);
        else if (qtdAcertos === 3) ternos.push(sorteio);
    });

    exibirResultado(senaEncontrada, quinas, quadras, ternos);
}

function exibirResultado(sena, quinas, quadras, ternos) {
    resultadoArea.style.display = 'block';
    resultadoArea.innerHTML = ''; 
    resultadoArea.className = 'resultado-area'; 

    if (sena) {
        resultadoArea.classList.add('ja-sorteado');
        resultadoArea.innerHTML = `
            <h3>⚠️ ESSA SENA JÁ SAIU!</h3>
            <p>Sorteada no <strong>Concurso ${sena.concurso}</strong> em <strong>${sena.data}</strong>.</p>
            <hr>
        `;
    } else {
        resultadoArea.classList.add('nunca-sorteado');
        resultadoArea.innerHTML = `
            <h3>✅ NUNCA SORTEADA!</h3>
            <p>Essa combinação nunca saiu na história da Mega Sena.</p>
            <hr>
        `;
    }

    resultadoArea.innerHTML += `
        <p><strong>Curiosidades sobre esses números:</strong></p>
        <p>• 5 acertos (Quina): <strong>${quinas.length}</strong> vezes.</p>
        <p>• 4 acertos (Quadra): <strong>${quadras.length}</strong> vezes.</p>
        <p>• 3 acertos (Terno): <strong>${ternos.length}</strong> vezes.</p>
    `;
} // <--- AQUI ERA O ERRO: Faltava fechar essa chave antes de começar as novas funções!

// --- 3. Novas Funções (Gerador de Palpites) ---

// Função para calcular os números mais frequentes
function obterNumerosQuentes() {
    // Proteção: se os dados não existirem, retorna vazio
    if (!window.dadosMega) return [];

    const contagem = {};
    
    // Zera a contagem para todos os números de 01 a 60
    for (let i = 1; i <= 60; i++) {
        const numStr = i.toString().padStart(2, '0');
        contagem[numStr] = 0;
    }

    // Conta quantas vezes cada número saiu na história
    window.dadosMega.forEach(sorteio => {
        sorteio.dezenas.forEach(dezena => {
            if (contagem[dezena] !== undefined) {
                contagem[dezena]++;
            }
        });
    });

    // Transforma em array e ordena do mais sorteado para o menos sorteado
    const ordenados = Object.keys(contagem).sort((a, b) => contagem[b] - contagem[a]);
    
    // Retorna os top 15 números mais quentes para misturar
    return ordenados.slice(0, 15);
}

// Função Principal do Gerador
function gerarPalpite(tipo) {
    const area = document.getElementById('palpite-area');
    let numerosEscolhidos = [];

    // Verifica se os dados carregaram antes de tentar gerar
    if (tipo === 'quente' && !window.dadosMega) {
        alert("Aguarde o carregamento dos dados!");
        return;
    }

    if (tipo === 'aleatorio') {
        // Gera 6 números totalmente aleatórios
        while (numerosEscolhidos.length < 6) {
            const num = Math.floor(Math.random() * 60) + 1;
            const numStr = num.toString().padStart(2, '0');
            if (!numerosEscolhidos.includes(numStr)) {
                numerosEscolhidos.push(numStr);
            }
        }
    } else if (tipo === 'quente') {
        // Pega os top 15 mais frequentes e sorteia 6 entre eles
        const quentes = obterNumerosQuentes();
        
        // Se der erro ao pegar quentes, evita loop infinito
        if (quentes.length === 0) return;

        while (numerosEscolhidos.length < 6) {
            const indiceAleatorio = Math.floor(Math.random() * quentes.length);
            const numEscolhido = quentes[indiceAleatorio];
            
            if (!numerosEscolhidos.includes(numEscolhido)) {
                numerosEscolhidos.push(numEscolhido);
            }
        }
    }

    // Ordena (crescente) e exibe
    numerosEscolhidos.sort((a, b) => a - b);
    
    const texto = tipo === 'quente' ? "🔥 Palpite Quente: " : "🎲 Surpresinha: ";
    
    area.innerHTML = `
        <span style="font-size: 0.9rem; color: #888; display: block; margin-bottom: 5px;">${texto}</span>
        <span style="color: #27ae60; background: #e8f5e9; padding: 5px 15px; border-radius: 20px; border: 1px solid #c8e6c9;">
            ${numerosEscolhidos.join(' - ')}
        </span>
    `;
}