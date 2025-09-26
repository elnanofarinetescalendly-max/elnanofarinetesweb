document.addEventListener('DOMContentLoaded', async () => {
    try {
        const resposta = await fetch('https://elnanofarinetes-server.onrender.com/api/tallers');
        const tallers = await resposta.json();
        const contenedor = document.getElementById('llista-tallers');

        if (!tallers || tallers.length === 0) {
            contenedor.innerHTML = '<p>No hi ha tallers disponibles actualment.</p>';
            return;
        }

        contenedor.innerHTML = ""; // netejar contingut

        tallers.forEach(taller => {
            const card = document.createElement('div');
            card.className = 'taller-card';

            let html = ``;

            // 👉 Imatge si existeix
            if (taller.imatge) {
                html += `<img src="${taller.imatge}" alt="${taller.titol}" class="taller-img">`;
            }

            // 👉 Títol i descripció
            html += `
                <h3>${taller.titol}</h3>
                <p><em>${taller.descripcio}</em></p>
            `;

            // 👉 Data i hora (si existeix)
            if (taller.data) {
                html += `<p><strong>Data:</strong> ${taller.data}${taller.hora ? " - " + taller.hora : ""}</p>`;
            }

            // 👉 Lloc si existeix
            if (taller.lloc) {
                html += `<p><strong>Lloc:</strong> ${taller.lloc}</p>`;
            }

            // 👉 Places disponibles
            if (taller.placesDisponibles > 0) {
                html += `<p>Places disponibles: ${taller.placesDisponibles}</p>`;
            } else {
                html += `<p><strong style="color:red;">Taller complet</strong></p>`;
            }

            // 👉 Botó de reserva
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
                toggle.classList.toggle("active"); // 👉 activa animació de la X
            });
        }

    } catch (error) {
        console.error("Error carregant tallers:", error);
        document.getElementById('llista-tallers').innerHTML =
            "<p>No s'han pogut carregar els tallers en aquest moment.</p>";
    }
    // Navbar amb efecte scroll
    window.addEventListener("scroll", () => {
      const nav = document.querySelector("nav");
      if (window.scrollY > 50) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
});
