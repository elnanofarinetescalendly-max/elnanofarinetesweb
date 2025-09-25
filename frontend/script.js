document.addEventListener('DOMContentLoaded', async () => {
    const resposta = await fetch('https://elnanofarinetes-server.onrender.com/api/tallers');
    const tallers = await resposta.json();
    const contenedor = document.getElementById('llista-tallers');

    if (tallers.length === 0) {
        contenedor.innerHTML = '<p>No hi ha tallers disponibles actualment.</p>';
        return;
    }

    contenedor.innerHTML = ""; // netejar contingut

    tallers.forEach(taller => {
        const card = document.createElement('div');
        card.className = 'taller-card';
          let html = ``;

        if (taller.imatge) {
        html += `<img src="${taller.imatge}" alt="${taller.titol}" class="taller-img">`;
        }

        let html = `
            <h3>${taller.titol}</h3>
            <p><strong>Data:</strong> ${taller.data}</p>
            <p><em>${taller.descripcio}</em></p>
        `;

        // Places disponibles
        if (taller.placesDisponibles > 0) {
            html += `<p>Places disponibles: ${taller.placesDisponibles}</p>`;
        } else {
            html += `<p><strong style="color:red;">Taller complet</strong></p>`;
        }

        // Botó de reserva
        if (taller.enllacReserva && taller.placesDisponibles > 0) {
            html += `<button onclick="window.open('${taller.enllacReserva}', '_blank')">Reservar</button>`;
        }

        card.innerHTML = html;
        contenedor.appendChild(card);
    });

    // 👉 Menú hamburguesa
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector("nav ul");

    if (toggle && menu) {
        toggle.addEventListener("click", () => {
            menu.classList.toggle("active");
        });
    }
});



