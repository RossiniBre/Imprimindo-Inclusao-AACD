// O router chama iniciar() quando a tela abre e destruir() quando sai.
// (o DOMContentLoaded não serve no SPA: ele só dispara uma vez, quando o index carrega)

export function iniciar() {
    // 1. Controle de Tamanho de Fonte
    let currentFontSize = 100;
    const btnIncrease = document.getElementById('btn-font-increase');
    const btnDecrease = document.getElementById('btn-font-decrease');

    if (btnIncrease) {
        btnIncrease.addEventListener('click', () => {
            if (currentFontSize < 130) {
                currentFontSize += 5;
                document.body.style.fontSize = `${currentFontSize}%`;
            }
        });
    }

    if (btnDecrease) {
        btnDecrease.addEventListener('click', () => {
            if (currentFontSize > 85) {
                currentFontSize -= 5;
                document.body.style.fontSize = `${currentFontSize}%`;
            }
        });
    }

    // 2. Modo Alto Contraste
    const btnContrast = document.getElementById('btn-contrast');
    if (btnContrast) {
        btnContrast.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
        });
    }
}

// ao sair da home, devolve o body ao normal (ele é compartilhado com as outras telas)
export function destruir() {
    document.body.style.fontSize = '';
    document.body.classList.remove('high-contrast');
}
