export function iniciar(container) {

        const vistas = container.querySelectorAll('.vista');
        function mostrar(nome) {
            vistas.forEach(v => v.hidden = v.id !== `vista-${nome}`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        container.querySelectorAll('[data-vista]').forEach(btn =>
            btn.addEventListener('click', () => mostrar(btn.dataset.vista)));

        container.querySelector('#btn-topo')?.addEventListener('click', () =>
            window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Rolar até um ponto da própria home (ex.: Unidades, no rodapé)
    container.querySelectorAll('[data-rolar]').forEach(btn =>
        btn.addEventListener('click', () =>
            container.querySelector(`#${btn.dataset.rolar}`)?.scrollIntoView({ behavior: 'smooth' })));

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