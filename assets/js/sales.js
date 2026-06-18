// ── Colombian Cities ──────────────────────────────
const COLOMBIAN_CITIES = {
    'Amazonas': ['Leticia', 'Puerto Nariño'],
    'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Rionegro', 'Apartadó', 'Turbo', 'La Estrella', 'Sabaneta', 'Caldas', 'Copacabana', 'Girardota', 'Barbosa', 'San Pedro de los Milagros', 'Santafe de Antioquia', 'Marinilla', 'El Carmen de Viboral', 'La Ceja', 'Jardín', 'Andes', 'Támesis', 'Jericó', 'Yarumal', 'Amalfi', 'Segovia', 'Remedios', 'Caucasia', 'Carepa', 'Chigorodó', 'Nechí', 'Zaragoza', 'Puerto Berrío', 'Puerto Triunfo', 'San Rafael', 'San Carlos', 'Guarne', 'El Peñol', 'Guatapé'],
    'Arauca': ['Arauca', 'Arauquita', 'Saravena', 'Tame', 'Fortul'],
    'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Baranoa', 'Sabanagrande', 'Santo Tomás', 'Galapa', 'Tubará', 'Juan de Acosta', 'Piojó', 'Usiacurí', 'Luruaco', 'Repelón', 'Manatí', 'Candelaria', 'Campo de la Cruz', 'Suán', 'Palmar de Varela', 'Polonuevo', 'Ponedera'],
    'Bogotá D.C.': ['Bogotá D.C.'],
    'Bolívar': ['Cartagena de Indias', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar', 'Mompós', 'San Pablo', 'Santa Rosa', 'Villanueva', 'María la Baja', 'Mahates', 'San Juan Nepomuceno', 'Calamar', 'Clemencia', 'Santa Catalina', 'San Estanislao', 'Soplaviento', 'Talaigua Nuevo', 'Córdoba', 'Margarita', 'Montecristo', 'Río Viejo', 'Regidor', 'El Peñón', 'Hatillo de Loba', 'San Martín de Loba', 'Altos del Rosario', 'Barranco de Loba', 'Pinillos', 'Arenal', 'Morales', 'Simití', 'Santa Rosa del Sur', 'San Jacinto del Cauca', 'Tiquisio', 'Achí', 'Montecristo', 'Tiquisio'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Samacá', 'Villa de Leyva', 'Ramiriquí', 'Tenza', 'Garagoa', 'Miraflores', 'Chivatá', 'Oicatá', 'Tuta', 'Siachoque', 'Toca', 'Zetaquirá', 'Ráquira', 'Sutamarchán', 'Sáchica', 'Tinjacá', 'Cómbita', 'Motavita', 'Cucaita', 'Ventaquemada', 'Turmequé', 'Úmbita', 'Tibiritá', 'La Capilla', 'Pachavita', 'Guayatá', 'Chocontá', 'Machetá', 'Manta', 'Sesquilé', 'Suesca', 'Tibirita', 'Villapinzón', 'Nemocón', 'Cogua', 'Gachancipá', 'Tocancipá', 'Zipaquirá', 'Sopó', 'Cajicá', 'Tabio', 'Tenjo', 'Subachoque', 'El Rosal', 'San Francisco', 'Bojacá', 'Zipacón', 'Madrid', 'Mosquera', 'Funza', 'Soacha'],
    'Caldas': ['Manizales', 'Chinchiná', 'Palestina', 'Neira', 'Villamaría', 'Anserma', 'Riosucio', 'Supía', 'Marmato', 'Salamina', 'Pácora', 'Aguadas', 'Aranzazu', 'Filadelfia', 'La Merced', 'Manzanares', 'Marulanda', 'Pensilvania', 'Samana', 'Victoria', 'Norcasia', 'La Dorada'],
    'Caquetá': ['Florencia', 'Cartagena del Chairá', 'San Vicente del Caguán', 'Puerto Rico', 'La Montañita', 'El Doncello', 'El Paujil', 'Albania', 'Curillo', 'Valparaíso', 'Solita', 'San José del Fragua', 'Belén de los Andaquíes', 'Milan'],
    'Casanare': ['Yopal', 'Villanueva', 'Paz de Ariporo', 'Trinidad', 'San Luis de Palenque', 'Maní', 'Tauramena', 'Monterrey', 'Sabanalarga', 'Nunchía', 'La Chaparrera', 'Aguazul', 'Chámeza', 'Recetor', 'Pore', 'Hato Corozal', 'Orocué'],
    'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Miranda', 'Piendamó', 'Cajibío', 'El Tambo', 'Timbío', 'Rosas', 'La Sierra', 'Almaguer', 'Argelia', 'Balboa', 'Bolívar', 'Buenos Aires', 'Caloto', 'Corinto', 'El Bordo', 'Guachené', 'Guapi', 'Inzá', 'Jambaló', 'La Vega', 'López', 'Mercaderes', 'Morales', 'Padilla', 'Páez', 'Patía', 'Piamonte', 'Puerto López', 'Puerto Rico', 'San Sebastián', 'Santa Rosa', 'Silvia', 'Sotará', 'Suárez', 'Sucre', 'Timbiquí', 'Toribío', 'Totoró', 'Villa Rica'],
    'Cesar': ['Valledupar', 'Aguachica', 'Codazzi', 'Bosconia', 'El Copey', 'San Diego', 'La Paz', 'San Alberto', 'San Martín', 'Río de Oro', 'Gamarra', 'Chimichagua', 'Chiriguaná', 'Astarrea', 'Becerril', 'La Jagua de Ibirico', 'Pailitas', 'Pelaya', 'Tamalameque', 'Curumaní', 'Manaure', 'La Gloria'],
    'Chocó': ['Quibdó', 'Istmina', 'Tadó', 'Condoto', 'Nóvita', 'Bagadó', 'Lloró', 'Atrato', 'El Carmen de Atrato', 'San José del Palmar', 'Cértegui', 'Unión Panamericana', 'Sipí', 'Medio Atrato', 'Bojayá', 'Vigía del Fuerte', 'Murindó', 'Unguía', 'Juradó', 'Bahía Solano', 'Nuquí', 'Alto Baudó', 'Bajo Baudó', 'El Litoral del San Juan', 'Riosucio', 'Carmen del Darién', 'Acandí'],
    'Córdoba': ['Montería', 'Lorica', 'Sahagún', 'Cereté', 'Planeta Rica', 'Ciénaga de Oro', 'San Carlos', 'Chinú', 'San Antero', 'San Bernardo del Viento', 'San Pelayo', 'Cotorra', 'Momil', 'Purísima', 'Santa Cruz de Lorica', 'San Andrés de Sotavento', 'Tuchín', 'Tierralta', 'Valencia', 'Puerto Libertador', 'Montelíbano', 'La Apartada', 'Buenavista', 'Ayapel', 'Pueblo Nuevo', 'Canalete', 'Los Córdobas', 'Moñitos', 'San José de Uré'],
    'Cundinamarca': ['Bogotá D.C.', 'Soacha', 'Fusagasugá', 'Zipaquirá', 'Facatativá', 'Chía', 'Madrid', 'Mosquera', 'Funza', 'Cajicá', 'Tabio', 'Tenjo', 'Subachoque', 'El Rosal', 'San Francisco', 'Bojacá', 'Zipacón', 'La Calera', 'Sopó', 'Tocancipá', 'Gachancipá', 'Nemocón', 'Cogua', 'Villapinzón', 'Suesca', 'Sesquilé', 'Chocontá', 'Machetá', 'Manta', 'Tibirita', 'Guatavita', 'Guasca', 'La Candelaria', 'Junín', 'Gachalá', 'Medina', 'Paratebueno', 'Fómeque', 'Choachí', 'Une', 'Chipaque', 'Cáqueza', 'Fosca', 'Quetame', 'Ubaque', 'Gutiérrez', 'Pasca', 'San Bernardo', 'Arbeláez', 'Venecia', 'Cabrera', 'Granada', 'Silvania', 'Sibaté', 'Nariño', 'Apulo', 'Tocaima', 'Agua de Dios', 'Nilo', 'Ricaurte', 'Girardot', 'Viotá', 'El Colegio', 'San Antonio del Tequendama', 'Tena', 'La Mesa', 'Anolaima', 'Bituima', 'Cachipay', 'Quipile', 'San Juan de Rioseco', 'Pulí', 'Beltrán', 'Jerusalén', 'Guayabal de Síquima', 'Vianí', 'Albán', 'Sasaima', 'Villa Gómez', 'La Vega', 'Nocaima', 'Villeta', 'Útica', 'Quebradanegra', 'Guaduas', 'Puerto Salgar', 'Caparrapí', 'Yacopí', 'Pacho', 'San Cayetano', 'Cucunubá', 'Tausa', 'Sutatausa'],
    'Guainía': ['Inírida', 'Puerto Colombia', 'La Guadalupe', 'Cacahual', 'Pana Pana', 'Morichal Nuevo', 'San Felipe', 'Barranco Minas'],
    'Guaviare': ['San José del Guaviare', 'Calamar', 'El Retorno', 'Miraflores', 'Puerto Concordia'],
    'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Rivera', 'Palermo', 'Santa María', 'San Agustín', 'Isnos', 'Saladoblanco', 'Oporapa', 'Elías', 'Timaná', 'Suaza', 'Guadalupe', 'Altamira', 'Gigante', 'Agrado', 'Tarqui', 'Paicol', 'Tesalia', 'Nátaga', 'La Argentina', 'Hobo', 'Yaguará', 'Íquira', 'Teruel', 'Baraya', 'Tello', 'Villavieja', 'Aipe', 'Colombia'],
    'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'Albania', 'Dibulla', 'Hatonuevo', 'Barrancas', 'Fonseca', 'Distracción', 'El Molino', 'Villanueva', 'Urumita', 'La Jagua del Pilar', 'San Juan del Cesar'],
    'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato', 'Aracataca', 'Algarrobo', 'Cerro de San Antonio', 'Concordia', 'El Piñón', 'El Retén', 'Guamal', 'Nueva Granada', 'Pedraza', 'Pivijay', 'Puebloviejo', 'Remolino', 'Sabanas de San Ángel', 'Salamina', 'San Sebastián de Buenavista', 'San Zenón', 'Santa Ana', 'Santa Bárbara de Pinto', 'Sitionuevo', 'Tenerife', 'Zapayán', 'Zona Bananera'],
    'Meta': ['Villavicencio', 'Acacías', 'Puerto López', 'Granada', 'Restrepo', 'Cumaral', 'San Martín', 'Puerto Gaitán', 'Puerto Lleras', 'Mesetas', 'La Macarena', 'El Dorado', 'San Juan de Arama', 'Lejanías', 'Castilla La Nueva', 'San Carlos de Guaroa', 'Barranca de Upía', 'Fuente de Oro', 'El Calvario', 'Cubarral', 'Cabuyaro', 'Mapiripán', 'La Uribe', 'Puerto Concordia', 'Vista Hermosa'],
    'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Barbacoas', 'La Unión', 'Túquerres', 'El Charco', 'Ricaurte', 'Cumbal', 'Guachucal', 'Aldana', 'Cuaspud', 'Contadero', 'Gualmatán', 'Puerres', 'Potosí', 'Funes', 'Iles', 'Imués', 'Ospina', 'Tangua', 'Yacuanquer', 'Consacá', 'Sandoná', 'Nariño', 'Ancuya', 'Linares', 'Sotomayor', 'El Tambo', 'La Florida', 'Chachagüí', 'Buesaco', 'Pasto', 'San Lorenzo', 'Taminango', 'El Tablón de Gómez', 'San José de Albán', 'Arboleda', 'Belén', 'Colón', 'San Pedro de Cartago', 'Santiago', 'La Cruz', 'La Unión', 'Roldanillo', 'Berruecos', 'Mallama', 'Cumbitara', 'El Rosario', 'Leiva', 'Policarpa', 'Providencia', 'Santa Cruz', 'Sapuyes', 'Túquerres', 'El Peñol'],
    'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Los Patios', 'Villa del Rosario', 'San José de Cúcuta', 'El Zulia', 'San Cayetano', 'Santiago', 'Gramalote', 'Lourdes', 'Salazar', 'Arboledas', 'Cáchira', 'La Esperanza', 'Chinácota', 'Ragonvalia', 'Herrán', 'Toledo', 'Labateca', 'Bochalema', 'Durania', 'Puerto Santander', 'Tibú', 'El Tarra', 'Teorama', 'Convención', 'San Calixto', 'Hacarí', 'Ábrego', 'La Playa de Belén', 'Bucarasica', 'Sardinata'],
    'Putumayo': ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez', 'San Miguel', 'Puerto Guzmán', 'Puerto Leguízamo', 'Sibundoy', 'Colón', 'Santiago', 'Villagarzón'],
    'Quindío': ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'La Tebaida', 'Circasia', 'Filandia', 'Salento', 'Buenavista', 'Pijao', 'Génova', 'Córdoba'],
    'Risaralda': ['Pereira', 'Dosquebradas', 'La Virginia', 'Santa Rosa de Cabal', 'Marsella', 'Belén de Umbría', 'Apía', 'Santuario', 'Balboa', 'La Celia', 'Guática', 'Quinchía', 'Pueblo Rico', 'Mistrató'],
    'San Andrés y Providencia': ['San Andrés', 'Providencia'],
    'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'San Vicente de Chucurí', 'Sabana de Torres', 'Puente Nacional', 'Barbosa', 'Vélez', 'Landázuri', 'Cimitarra', 'Puerto Parra', 'El Playón', 'Rionegro', 'Matanza', 'Suratá', 'California', 'Charta', 'Tona', 'Vetas', 'Málaga', 'Concepción', 'San Andrés', 'Guaca', 'San José de Miranda', 'Enciso', 'Capitanejo', 'Macaravita', 'San Miguel', 'Carcasí', 'Cerrito', 'Santa Bárbara', 'Aratoca', 'Curití', 'Villanueva', 'Barichara', 'Cabrera', 'Galán', 'Hato', 'Palmar', 'Palmas del Socorro', 'Simacota', 'Confines', 'Ocamonte', 'Charalá', 'Coromoro', 'Betulia', 'Zapatoca', 'Los Santos', 'San Joaquín', 'Jordán', 'Guadalupe', 'Santa Helena del Opón', 'Contratación', 'Aguachica', 'San Vicente de Chucurí', 'El Carmen de Chucurí', 'Simití'],
    'Sucre': ['Sincelejo', 'Corozal', 'San Marcos', 'San Benito Abad', 'San Onofre', 'Ovejas', 'Tolú', 'Sampués', 'Chalán', 'Colosó', 'Morroa', 'Los Palmitos', 'Palmito', 'San Antonio de Palmito', 'San Juan de Betulia', 'San Pedro', 'La Unión', 'Caimito', 'Guaranda', 'Majagual', 'Sucre', 'Buenavista', 'Galeras'],
    'Tolima': ['Ibagué', 'Espinal', 'Líbano', 'Honda', 'Mariquita', 'Fresno', 'Méndez', 'San Luis', 'Rovira', 'Valle de San Juan', 'San Antonio', 'Alvarado', 'Anzoátegui', 'Armero', 'Casabianca', 'Chaparral', 'Coello', 'Coyaima', 'Cunday', 'Dolores', 'Falan', 'Flandes', 'Guamo', 'Herveo', 'Icononzo', 'Lérida', 'Melgar', 'Murillo', 'Natagaima', 'Ortega', 'Palocabildo', 'Piedras', 'Planadas', 'Prado', 'Purificación', 'Rioblanco', 'Roncesvalles', 'Saldaña', 'San Sebastián de Mariquita', 'Santa Isabel', 'Suárez', 'Valle de San José', 'Venadillo', 'Villahermosa', 'Villarrica'],
    'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga', 'Yumbo', 'Jamundí', 'Santander de Quilichao', 'Roldanillo', 'Caicedonia', 'Sevilla', 'Zarzal', 'La Unión', 'Toro', 'Obando', 'El Cairo', 'Argelia', 'El Águila', 'Ansermanuevo', 'Trujillo', 'Bolívar', 'Río Frío', 'El Dovio', 'La Victoria', 'La Cumbre', 'Dagua', 'Restrepo', 'Yotoco', 'Vijes', 'Ginebra', 'Guacarí', 'San Pedro', 'Buga La Grande', 'Candelaria', 'Florida', 'Pradera', 'Palmira', 'El Cerrito', 'Ginebra', 'Calima', 'El Darién', 'Ulloa', 'Alcalá', 'Cartago'],
    'Vaupés': ['Mitú', 'Carurú', 'Taraira', 'Papunaua', 'Yavaraté'],
    'Vichada': ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo']
};

function populateCities() {
    const datalist = document.getElementById('cityDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    const allCities = [];
    for (const [dept, cities] of Object.entries(COLOMBIAN_CITIES)) {
        cities.forEach(city => {
            allCities.push({ city, dept });
            const opt = document.createElement('option');
            opt.value = city;
            opt.label = `${city} (${dept})`;
            datalist.appendChild(opt);
        });
    }
}

function loadClientData() {
    const idEl = document.getElementById('m_sale_client_id');
    if (!idEl) return;
    const clientId = idEl.value.trim();
    if (!clientId || clientId.length < 3) return;

    const client = (state.clients || []).find(c => c.id === clientId);
    if (client) {
        document.getElementById('m_sale_client').value = client.name || '';
        const citySelect = document.getElementById('m_sale_city');
        if (citySelect) citySelect.value = client.city || '';
    }
}

function saveClientData(clientId, name, city) {
    if (!clientId || !name) return;
    if (!state.clients) state.clients = [];
    const existing = state.clients.findIndex(c => c.id === clientId);
    const clientData = { id: clientId, name, city, lastPurchase: new Date().toISOString() };
    if (existing !== -1) {
        state.clients[existing] = { ...state.clients[existing], ...clientData };
    } else {
        clientData.createdAt = new Date().toISOString();
        state.clients.push(clientData);
    }
}

function onSalePeriodChange() {
    const period = document.getElementById('filterSalePeriod').value;
    const customDiv = document.getElementById('customSaleDates');

    if (period === 'custom') {
        customDiv.style.display = 'flex';
        const today = getLocalDateString();
        const fromEl = document.getElementById('filterSaleFrom');
        const toEl = document.getElementById('filterSaleTo');
        fromEl.removeAttribute('min');
        fromEl.removeAttribute('max');
        toEl.removeAttribute('min');
        toEl.removeAttribute('max');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        fromEl.value = getLocalDateString(thirtyDaysAgo);
        toEl.value = today;
    } else {
        customDiv.style.display = 'none';
    }
    renderSales();
}

// --- Multi-Device Sale ---
let saleDeviceCount = 0;

function addSaleDevice() {
    saleDeviceCount++;
    const id = saleDeviceCount;
    const available = state.inventory.filter(i => i.status === 'Disponible');
    if (available.length === 0) { alert('No hay equipos disponibles en inventario.'); return; }

    const options = available.map(i =>
        `<option value="${escapeHtml(i.serial)}">${escapeHtml(i.model)} — ${escapeHtml(i.serial)}</option>`
    ).join('');

    const row = document.createElement('div');
    row.id = `sale-device-${id}`;
    row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:0.5rem;align-items:end;background:var(--light-gray);padding:0.75rem;border-radius:10px;';
    row.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Dispositivo ${id}</label>
            <div style="display:flex;gap:0.4rem;">
                <select id="sale-serial-${id}" onchange="updateSaleTotal()" required
                    style="flex:1;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;background:var(--white);">
                    ${options}
                </select>
                <button type="button" onclick="startScanner('sale-scanner-${id}')" title="Escanear"
                    style="background:var(--white);border:1.5px solid var(--border);border-radius:8px;padding:0 0.6rem;cursor:pointer;display:flex;align-items:center;">
                    <i data-lucide="scan" style="width:16px;height:16px;color:var(--deep-blue);"></i>
                </button>
            </div>
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Precio ($)</label>
            <input type="number" id="sale-price-${id}" min="0" oninput="updateSaleTotal()" required
                style="width:110px;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;">
        </div>
        <button type="button" onclick="removeSaleDevice(${id})"
            style="background:none;border:none;cursor:pointer;color:var(--vibrant-red);padding:0.4rem;align-self:end;margin-bottom:2px;">
            <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
        </button>`;

    document.getElementById('saleDeviceList').appendChild(row);
    lucide.createIcons();
    updateSaleTotal();
}

function removeSaleDevice(id) {
    const el = document.getElementById(`sale-device-${id}`);
    if (el) el.remove();
    if (document.getElementById('saleDeviceList').children.length === 0) addSaleDevice();
    updateSaleTotal();
}

function updateSaleTotal() {
    const list = document.getElementById('saleDeviceList');
    if (!list) return;
    let total = 0;
    list.querySelectorAll('[id^="sale-price-"]').forEach(el => {
        total += parseFloat(el.value) || 0;
    });
    const display = document.getElementById('saleTotalDisplay');
    if (display) display.innerText = `$${Math.round(total).toLocaleString()}`;
}

const saleForm = document.getElementById('saleForm');
if (saleForm) saleForm.onsubmit = function (e) {
    e.preventDefault();
    const clientId = document.getElementById('m_sale_client_id').value.trim();
    const client = document.getElementById('m_sale_client').value.trim();
    const city = document.getElementById('m_sale_city').value;
    const source = document.getElementById('m_sale_source').value;
    const saleDate = document.getElementById('m_sale_date').value;

    // --- EDIT MODE ---
    if (editingSaleIndex !== -1) {
        const priceEls = document.querySelectorAll('#saleDeviceList [id^="sale-price-"]');
        const prices = [...priceEls].map(el => parseFloat(el.value));
        if (prices.some(p => !p || p <= 0)) { alert('Ingresa precios válidos.'); return; }
        const s = state.sales[editingSaleIndex];
        if (s.devices) {
            s.devices.forEach((d, i) => { d.price = prices[i] || d.price; });
            s.total = prices.reduce((a, p) => a + p, 0);
        } else {
            s.price = prices[0];
        }
        s.client = client; s.city = city; s.source = source; s.saleDate = saleDate;
        s.clientId = clientId;
        const serials = s.devices ? s.devices.map(d => d.serial) : [s.serial];
        const totalPrice = s.total || s.price;
        const trans = state.transactions.find(t => t.type === 'income' && t.category === 'Venta' && serials.some(ser => t.description.includes(ser)));
        if (trans) { trans.amount = totalPrice; trans.date = saleDate; trans.description = `Venta ${serials.length} equipo(s) — ${serials.join(', ')} — Cliente: ${client}`; }
        if (clientId) saveClientData(clientId, client, city);
        saveState(); closeModal('saleModal'); renderSales(); updateDashboard();
        return;
    }

    // --- NEW MODE ---
    const list = document.getElementById('saleDeviceList');
    const rows = list ? [...list.children] : [];

    if (rows.length === 0) { alert('Agrega al menos un dispositivo.'); return; }

    const serials = rows.map(row => {
        const sel = row.querySelector('[id^="sale-serial-"]');
        return sel ? sel.value : '';
    });
    if (new Set(serials).size !== serials.length) {
        alert('Hay dispositivos duplicados en la venta. Verifica los seriales.');
        return;
    }

    const devices = [];
    for (const row of rows) {
        const selEl = row.querySelector('[id^="sale-serial-"]');
        const priceEl = row.querySelector('[id^="sale-price-"]');
        if (!selEl || !priceEl) continue;
        const serial = selEl.value;
        const price = parseFloat(priceEl.value);
        if (!serial || !price || price <= 0) { alert('Precio inválido'); return; }
        const item = state.inventory.find(i => i.serial === serial);
        if (!item || item.status !== 'Disponible') {
            alert(`El equipo ${serial} ya no está disponible.`);
            return;
        }
        item.status = 'Vendido';
        devices.push({ serial, model: item.model, cost: item.cost, price });
    }
    if (devices.length === 0) return;

    const totalPrice = devices.reduce((sum, d) => sum + d.price, 0);
    const saleId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    state.sales.push({
        id: saleId, devices, total: totalPrice,
        client, clientId, city, source, saleDate,
        createdAt: new Date().toISOString()
    });
    state.transactions.push({
        id: Date.now() + Math.random(),
        type: 'income', category: 'Venta',
        description: `Venta ${devices.length} equipo(s) — ${devices.map(d => d.serial).join(', ')} — Cliente: ${client}`,
        amount: totalPrice, date: saleDate, createdAt: new Date().toISOString()
    });

    if (clientId) saveClientData(clientId, client, city);
    saveState(); closeModal('saleModal'); renderSales(); updateDashboard();
};

function renderSales() {
    const searchInput = document.getElementById('searchSales');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const salePeriod = document.getElementById('filterSalePeriod') ? document.getElementById('filterSalePeriod').value : '';
    const saleFrom = document.getElementById('filterSaleFrom') ? document.getElementById('filterSaleFrom').value : '';
    const saleTo = document.getElementById('filterSaleTo') ? document.getElementById('filterSaleTo').value : '';
    const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

    const tbody = document.querySelector('#salesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    function getSaleSerials(s) {
        if (s.devices) return s.devices.map(d => d.serial);
        return [s.serial];
    }

    let filtered = state.sales.filter(s => {
        const serials = getSaleSerials(s);
        const matchSearch =
            (s.client || '').toLowerCase().includes(search) ||
            serials.some(ser => ser.toLowerCase().includes(search)) ||
            (s.city || '').toLowerCase().includes(search);
        let matchDate = true;
        if (saleDateRange) {
            const d = parseDateLocal(s.saleDate);
            matchDate = d && d >= saleDateRange.from && d <= saleDateRange.to;
        }
        return matchSearch && matchDate;
    });

    // Orden descendente: último creado primero
    filtered.sort((a, b) => {
        const da = new Date(a.createdAt || a.saleDate).getTime() || 0;
        const db = new Date(b.createdAt || b.saleDate).getTime() || 0;
        return db - da;
    });

    filtered.forEach((s) => {
        if (!s) return;
        const index = state.sales.indexOf(s);
        const priceNum = getSaleTotal(s);
        const costNum = getSaleCost(s);
        const utility = priceNum - costNum;
        const utilityColor = utility < 0 ? 'var(--vibrant-red)' : '#047481';
        const margin = priceNum > 0 ? ((utility / priceNum) * 100).toFixed(0) : 0;

        const serials = getSaleSerials(s);
        const firstSerial = serials[0];
        const modelHtml = s.devices
            ? `<div style="display:flex;flex-direction:column;gap:0.35rem;">${s.devices.map(d => `<div style="display:flex;align-items:baseline;gap:0.4rem;${s.devices.indexOf(d) > 0 ? 'padding-top:0.35rem;border-top:1px dashed var(--border);' : ''}"><strong style="font-size:0.82rem;">${escapeHtml(d.model)}</strong><span style="font-size:0.75rem;color:var(--text-gray);font-family:monospace;">${escapeHtml(d.serial)}</span></div>`).join('')}</div>`
            : `<div style="display:flex;align-items:baseline;gap:0.4rem;"><strong style="font-size:0.82rem;">${escapeHtml(s.model)}</strong><span style="font-size:0.75rem;color:var(--text-gray);font-family:monospace;">${escapeHtml(s.serial)}</span></div>`;

        const eClient = escapeHtml(s.client);
        const eSource = escapeHtml(s.source);

        const retBtn = s.returned
            ? `<span style="font-size:0.65rem; color:var(--vibrant-red); font-weight:800; background:rgba(238,66,78,0.1); padding:0.2rem 0.4rem; border-radius:100px;">DEVUELTO</span>`
            : `<button onclick="openReturnModal('${firstSerial}')" title="Registrar devolución" style="background:none; border:none; cursor:pointer; color:var(--vibrant-red); display:flex; align-items:center; padding:0.25rem;">
                 <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
               </button>`;

        tbody.innerHTML += `
            <tr>
                <td data-label="Fecha">${escapeHtml(s.saleDate)}</td>
                <td data-label="Modelo">${modelHtml}</td>
                <td data-label="Cliente">${eClient}</td>
                <td data-label="Precio"><strong>$${priceNum.toLocaleString()}</strong></td>
                <td data-label="Utilidad" style="color: ${utilityColor}; font-weight: 700;">
                    $${utility.toLocaleString()} <br><small style="color:var(--text-gray)">${margin}%</small>
                </td>
                <td data-label="Canal"><span class="badge" style="background:#E2E8F0; color:var(--deep-blue)">${eSource}</span></td>
                <td data-label="Acciones">
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <button onclick="editSale('${firstSerial}')" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>
                        <button onclick="deleteSale('${firstSerial}')" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>
                        ${retBtn}
                    </div>
                </td>
            </tr>`;
    });

    const countEl = document.getElementById('salesResultCount');
    if (countEl) {
        countEl.innerText = saleDateRange
            ? `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en el período`
            : `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en total`;
    }
    lucide.createIcons();
}

function editSale(serial) {
    const index = state.sales.findIndex(s => {
        if (s.devices) return s.devices.some(d => d.serial === serial);
        return s.serial === serial;
    });
    if (index === -1) return;
    editingSaleIndex = index;
    const s = state.sales[index];

    populateSources();
    populateCities();
    document.getElementById('m_sale_date').value = s.saleDate;
    document.getElementById('m_sale_client').value = s.client;
    document.getElementById('m_sale_client_id').value = s.clientId || '';
    document.getElementById('m_sale_city').value = s.city || '';
    document.getElementById('m_sale_source').value = s.source;

    const deviceList = document.getElementById('saleDeviceList');
    if (deviceList) deviceList.innerHTML = '';
    saleDeviceCount = 0;

    const devices = s.devices || [{ serial: s.serial, model: s.model, price: s.price }];
    devices.forEach((d, i) => {
        saleDeviceCount++;
        const id = saleDeviceCount;
        const eModel = escapeHtml(d.model);
        const eSerial = escapeHtml(d.serial);
        const row = document.createElement('div');
        row.id = `sale-device-${id}`;
        row.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:0.5rem;align-items:end;background:var(--light-gray);padding:0.75rem;border-radius:10px;';
        row.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Dispositivo ${i+1} — ${eModel}</label>
            <input type="text" value="${eSerial} — ${eModel}" readonly
                style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;background:var(--light-gray);color:var(--text-gray);cursor:not-allowed;">
            <input type="hidden" id="sale-serial-${id}" value="${eSerial}">
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Precio ($)</label>
            <input type="number" id="sale-price-${id}" value="${d.price}" min="0" oninput="updateSaleTotal()" required
                style="width:120px;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;">
        </div>`;
        deviceList.appendChild(row);
    });
    updateSaleTotal();
    openModal('saleModal');
    lucide.createIcons();
}

function deleteSale(serial) {
    if (confirm('¿Eliminar esta venta? Se ajustará el inventario y las finanzas automáticamente.')) {
        const index = state.sales.findIndex(s => {
            if (s.devices) return s.devices.some(d => d.serial === serial);
            return s.serial === serial;
        });
        if (index === -1) return;
        const s = state.sales[index];
        const serials = s.devices ? s.devices.map(d => d.serial) : [s.serial];

        // 1. Revertir inventario de todos los dispositivos
        serials.forEach(ser => {
            const item = state.inventory.find(i => i.serial === ser);
            if (item) {
                item.status = 'Disponible';
                if (item.returnNote) delete item.returnNote;
            }
        });

        // 2. Eliminar transacción financiera de la venta
        state.transactions = state.transactions.filter(t => 
            !(t.type === 'income' && t.category === 'Venta' && serials.some(ser => t.description.includes(ser)))
        );

        // 3. Si fue devuelta, eliminar el registro de devolución y su transacción
        if (s.returned) {
            const retId = s.returnId;
            state.returns = (state.returns || []).filter(r => r.id !== retId);
            state.transactions = state.transactions.filter(t => 
                !(t.category === 'Devolución' && serials.some(ser => t.description.includes(ser)))
            );
        }

        // 4. Eliminar la venta
        state.sales.splice(index, 1);
        
        saveState();
        renderSales();
        updateDashboard();
    }
}

const returnForm = document.getElementById('returnForm');
if (returnForm) returnForm.onsubmit = async (e) => {
    e.preventDefault();
    if (currentReturnSaleIndex === -1) return;

    const s = state.sales[currentReturnSaleIndex];
    const retSerial = currentReturnSerial || s.serial;
    const device = s.devices ? s.devices.find(d => d.serial === retSerial) : s;
    const item = state.inventory.find(i => i.serial === retSerial);
    const cost = item ? (item.cost || 0) : 0;
    const action = document.getElementById('m_ret_action').value;
    const condition = document.getElementById('m_ret_condition').value;

    // Crear registro de devolución
    const ret = {
        id: 'RET-' + Date.now(),
        serial: retSerial,
        model: device.model || '',
        client: s.client || '',
        city: s.city || '',
        saleDate: s.saleDate || '',
        returnDate: document.getElementById('m_ret_date').value,
        salePrice: device.price || 0,
        cost: cost,
        reason: document.getElementById('m_ret_reason').value,
        condition: condition,
        action: action,
        notes: document.getElementById('m_ret_notes').value,
        source: s.source || '',
        createdAt: new Date().toISOString()
    };

    // Agregar a state.returns
    if (!state.returns) state.returns = [];
    state.returns.push(ret);

    // Trazabilidad: marcar la venta como devuelta
    state.sales[currentReturnSaleIndex].returned = true;
    state.sales[currentReturnSaleIndex].returnId = ret.id;

    // Acción sobre el inventario según decisión
    if (action === 'Reingreso' && item) {
        // Volver a disponible
        item.status = 'Disponible';
        item.entryDate = ret.returnDate;
        item.returnNote = `Reingreso por devolución ${ret.id}`;
    } else if (action === 'Baja' && item) {
        item.status = 'Baja';
        item.returnNote = `Baja por devolución ${ret.id}`;
    } else if (action === 'Garantía' && item) {
        item.status = 'Garantía';
        item.returnNote = `En garantía por devolución ${ret.id}`;
    }

    // Registrar automáticamente en finanzas como egreso
    // si el precio de venta fue cobrado (impacto financiero)
    state.transactions.push({
        type: 'expense',
        category: 'Devolución',
        description: `Devolución ${ret.id} — ${escapeHtml(retSerial)} — Cliente: ${escapeHtml(s.client || 'N/A')}`,
        amount: device.price || 0,
        date: ret.returnDate,
        createdAt: new Date().toISOString()
    });

    await saveState();
    closeReturnModal();
    renderSales();
    updateDashboard();

    alert(`✅ Devolución ${ret.id} registrada.\n` +
          `Acción: ${action}\n` +
          `El equipo fue marcado como: ${
              action === 'Reingreso' ? 'Disponible' :
              action === 'Garantía' ? 'En Garantía' : 'Baja'
          }`);
};

// ── Clients / Clientes ─────────────────────────────────────────
function getClientStats(clientId) {
    const sales = state.sales.filter(s => s.clientId === clientId && s.returned !== true);
    const totalSpent = sales.reduce((sum, s) => sum + getSaleTotal(s), 0);
    const lastSale = sales.length > 0 ? sales.reduce((a, b) => new Date(a.saleDate) > new Date(b.saleDate) ? a : b) : null;
    return { count: sales.length, totalSpent, lastSale };
}

function renderClients() {
    const search = (document.getElementById('searchClients')?.value || '').toLowerCase().trim();
    const clients = state.clients || [];
    const tbody = document.querySelector('#clientsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = clients;
    if (search) {
        filtered = clients.filter(c =>
            (c.id || '').toLowerCase().includes(search) ||
            (c.name || '').toLowerCase().includes(search) ||
            (c.city || '').toLowerCase().includes(search)
        );
    }

    // Ordenar por última compra descendente
    filtered.sort((a, b) => {
        const da = a.lastPurchase ? new Date(a.lastPurchase) : new Date(0);
        const db = b.lastPurchase ? new Date(b.lastPurchase) : new Date(0);
        return db - da;
    });

    const totalSalesAll = clients.reduce((sum, c) => sum + getClientStats(c.id).count, 0);
    let topCity = '—';
    const cityCount = {};
    clients.forEach(c => {
        if (c.city) {
            cityCount[c.city] = (cityCount[c.city] || 0) + 1;
        }
    });
    const cityEntries = Object.entries(cityCount).sort((a, b) => b[1] - a[1]);
    if (cityEntries.length > 0) topCity = cityEntries[0][0];

    let lastDate = '—';
    const allDates = clients.map(c => c.lastPurchase).filter(Boolean).sort().reverse();
    if (allDates.length > 0) {
        lastDate = new Date(allDates[0]).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    document.getElementById('cli-kpi-total').innerText = clients.length;
    document.getElementById('cli-kpi-sales').innerText = totalSalesAll;
    document.getElementById('cli-kpi-topcity').innerText = topCity;
    document.getElementById('cli-kpi-last').innerText = lastDate;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-gray);font-weight:500;">${
            search ? 'No se encontraron clientes con ese criterio.' : 'No hay clientes registrados aún.'
        }</td></tr>`;
        lucide.createIcons();
        return;
    }

    filtered.forEach(c => {
        const stats = getClientStats(c.id);
        const lastPurchaseStr = c.lastPurchase
            ? new Date(c.lastPurchase).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
        const name = escapeHtml(c.name || '—');
        const city = escapeHtml(c.city || '—');
        const eId = escapeHtml(c.id || '');

        tbody.innerHTML += `
            <tr>
                <td data-label="ID" style="font-family:monospace;font-weight:600;">${eId}</td>
                <td data-label="Nombre">${name}</td>
                <td data-label="Ciudad">${city}</td>
                <td data-label="Compras"><strong>${stats.count}</strong></td>
                <td data-label="Total"><strong>$${stats.totalSpent.toLocaleString()}</strong></td>
                <td data-label="Última Compra">${lastPurchaseStr}</td>
                <td data-label="Acciones">
                    <button onclick="viewClientHistory('${eId}')" class="btn btn-secondary" style="padding:0.3rem 0.8rem;font-size:0.78rem;">
                        <i data-lucide="eye" style="width:14px;height:14px;"></i> Ver
                    </button>
                </td>
            </tr>`;
    });

    lucide.createIcons();
}

function viewClientHistory(clientId) {
    const client = (state.clients || []).find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('clientsListView').style.display = 'none';
    document.getElementById('clientHistoryView').style.display = 'block';

    const title = document.getElementById('clientHistoryTitle');
    title.innerText = `Historial de ${escapeHtml(client.name)} (${escapeHtml(client.id)})`;

    const tbody = document.querySelector('#clientHistoryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const sales = state.sales.filter(s => s.clientId === clientId).sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

    const emptyEl = document.getElementById('clientHistoryEmpty');
    if (sales.length === 0) {
        emptyEl.style.display = 'block';
        lucide.createIcons();
        return;
    }
    emptyEl.style.display = 'none';

    sales.forEach(s => {
        const serials = s.devices ? s.devices.map(d => d.serial).join(', ') : s.serial;
        const models = s.devices ? s.devices.map(d => d.model).join(', ') : s.model;
        const total = getSaleTotal(s);
        tbody.innerHTML += `
            <tr>
                <td data-label="Fecha">${escapeHtml(s.saleDate)}</td>
                <td data-label="Dispositivos">${escapeHtml(models)}<br><small style="color:var(--text-gray);font-size:0.7rem;">${escapeHtml(serials)}</small></td>
                <td data-label="Total"><strong>$${total.toLocaleString()}</strong></td>
                <td data-label="Ciudad">${escapeHtml(s.city || '—')}</td>
                <td data-label="Canal">${escapeHtml(s.source || '—')}</td>
            </tr>`;
    });

    lucide.createIcons();
}

function showClientsList() {
    document.getElementById('clientsListView').style.display = 'block';
    document.getElementById('clientHistoryView').style.display = 'none';
    renderClients();
}
