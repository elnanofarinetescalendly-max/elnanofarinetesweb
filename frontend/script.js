document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 👉 Carregar tallers
    const resposta = await fetch('https://elnanofarinetes-server.onrender.com/api/tallers');
    const tallers = await resposta.json();
    const contenedor = document.getElementById('llista-tallers');

    if (!tallers || tallers.length === 0) {
      contenedor.innerHTML = '<p>No hi ha tallers disponibles actualment.</p>';
    } else {
      contenedor.innerHTML = ""; // netejar contingut

      tallers.forEach(taller => {
        const card = document.createElement('div');
        card.className = 'taller-card';

        let html = ``;

        if (taller.imatge) {
          html += `<img src="${taller.imatge}" alt="${taller.titol}" class="taller-img">`;
        }

        html += `
          <h3>${taller.titol}</h3>
          <p><em>${taller.descripcio}</em></p>
        `;

        if (taller.data) {
          html += `<p><strong>Data:</strong> ${taller.data}${taller.hora ? " - " + taller.hora : ""}</p>`;
        }

        if (taller.lloc) {
          html += `<p><strong>Lloc:</strong> ${taller.lloc}</p>`;
        }

        if (taller.placesDisponibles > 0) {
          html += `<p>Places disponibles: ${taller.placesDisponibles}</p>`;
        } else {
          html += `<p><strong style="color:red;">Taller complet</strong></p>`;
        }

        if (taller.enllacReserva && taller.placesDisponibles > 0) {
          html += `<button onclick="window.open('${taller.enllacReserva}', '_blank')">Reservar</button>`;
        }

        card.innerHTML = html;
        contenedor.appendChild(card);
      });
    }

    // 👉 Menú hamburguesa
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.querySelector("nav ul");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("active");
        toggle.classList.toggle("active"); // animació de la X
      });
    }

    // 👉 Navbar amb efecte scroll
    const nav = document.querySelector("nav");
    const onScroll = () => {
      if (window.scrollY > 50) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    };
    onScroll(); // comprova en carregar
    window.addEventListener("scroll", onScroll, { passive: true });

  } catch (error) {
    console.error("Error carregant tallers:", error);
    document.getElementById('llista-tallers').innerHTML =
      "<p>No s'han pogut carregar els tallers en aquest moment.</p>";
  }
});
