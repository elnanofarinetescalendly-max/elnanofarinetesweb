document.addEventListener('DOMContentLoaded', async () => {
    const resposta = await fetch('https://elnanofarinetes-server.onrender.com/api/tallers');
    const tallers = await resposta.json();
    const contenedor = document.getElementById('llista-tallers');

    if (tallers.length === 0) {
        contenedor.innerHTML = '<p>No hi ha tallers disponibles actualment.</p>';
        return;
    }

    const ul = document.createElement('ul');
    tallers.forEach(taller => {
        const li = document.createElement('li');
        let html = `<strong>${taller.titol}</strong> - ${taller.data}<br><em>${taller.descripcio}</em>`;

        // 👇 Afegeix les places disponibles
        if (taller.placesDisponibles > 0) {
            html += `<br>Places disponibles: ${taller.placesDisponibles}`;
        } else {
            html += `<br><strong style="color:red;">Taller complet</strong>`;
        }

        // 👇 Si té enllaç de reserva i places, afegeix botó
        if (taller.enllacReserva && taller.placesDisponibles > 0) {
            html += `<br><a href="${taller.enllacReserva}" target="_blank"><button>Reservar</button></a>`;
        }

        li.innerHTML = html;
        ul.appendChild(li);
    });

    contenedor.appendChild(ul);
});


