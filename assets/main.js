// prevent right click menu from appearing and annoying people - awdev1
document.addEventListener('contextmenu', function(event) {
	event.preventDefault();
});
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');

let offsetX = 0,
	offsetY = 0;
let scale = 1;
let isDragging = false;
let startX, startY;
let onlineATC = 0;

// Configuração do tamanho do canvas
function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 50;
	draw();
}
window.addEventListener('resize', resizeCanvas);

// Carregamento da imagem do mapa
const mapImage = new Image();
mapImage.src = 'PTFS-Map-Grey.png';
mapImage.onload = resizeCanvas;

// Função de transformação das coordenadas
function transformCoordinates(coord) {
	return [
		coord[0] * scale + offsetX,
		coord[1] * scale + offsetY
	];
}

// Função de desenho
function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const mapWidth = 1200 * scale;
	const mapHeight = 1200 * scale;
	ctx.drawImage(mapImage, offsetX, offsetY, mapWidth, mapHeight);
	drawControlAreas();
}

// Função para desenhar áreas de controle
function drawControlAreas() {
	// Desenho das polylines
	controlAreas.forEach(area => {
		if (area.active && area.type === 'polyline') {
			const coordinates = area.coordinates.map(transformCoordinates);
			ctx.beginPath();
			ctx.strokeStyle = area.color;
			ctx.lineWidth = 0.5;

			coordinates.forEach((point, index) => {
				if (index === 0) {
					ctx.moveTo(point[0], point[1]);
				} else {
					ctx.lineTo(point[0], point[1]);
				}
			});
			ctx.stroke();
		}
	});

	// Desenho dos polygons (TMAs e CTRs)
	controlAreas.forEach(area => {
		if (area.type === 'polygon') {
			let drawCTR = false;
			let drawAPP = false;

			// Verifica se algum aeroporto possui o valor "ctr" ou "app" igual ao nome da área e "tower" ativo
			controlAreas.forEach(airport => {
				if (airport.type === 'Airport' && airport.tower) {
					if (airport.ctr === area.name) {
						drawCTR = true;
					}
					if (airport.app === area.name) {
						drawAPP = true;
					}
				}
			});

			// Desenha o CTR se existir
			if (drawCTR) {
				const coordinates = area.coordinates.map(transformCoordinates);
				ctx.beginPath();
				ctx.strokeStyle = area.color;
				ctx.fillStyle = area.fillColor;
				ctx.lineWidth = 0.5;

				coordinates.forEach((point, index) => {
					if (index === 0) {
						ctx.moveTo(point[0], point[1]);
					} else {
						ctx.lineTo(point[0], point[1]);
					}
				});
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			}

			// Desenha o APP se existir
			if (drawAPP) {
				const coordinates = area.coordinates.map(transformCoordinates);
				ctx.beginPath();
				ctx.strokeStyle = area.color;
				ctx.fillStyle = area.fillColor;
				ctx.lineWidth = 0.5;

				coordinates.forEach((point, index) => {
					if (index === 0) {
						ctx.moveTo(point[0], point[1]);
					} else {
						ctx.lineTo(point[0], point[1]);
					}
				});
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			}
		}
	});
}

// Função para atualizar a posição do aeroporto
function updatePosition(airportUI, airport) {
	if (scale < airport.scale) {
		airportUI.style.display = 'none';
		return;
	} else {
		airportUI.style.display = 'block';
	}

	const [x, y] = transformCoordinates(airport.coordinates);
	const uiWidth = airportUI.offsetWidth;
	const uiHeight = airportUI.offsetHeight;

	airportUI.style.left = `${x - uiWidth / 2}px`;
	airportUI.style.top = `${y + uiHeight / 2}px`;
}

function createAirportUI(airport) {
	const airportUI = document.createElement('div');
	airportUI.className = 'airport-ui';
	airportUI.style.zIndex = 10 + (3 - airport.originalscale);
	airportUI.innerHTML = `
            <p>${airport.name}</p>
            ${airport.ctr && airport.tower ? '<div class="badge C">C</div>' : ''}
            ${airport.app && airport.tower && !airport.ctr ? '<div class="badge A">A</div>' : ''}
            ${!airport.ctr && !airport.app && airport.tower ? '<div class="badge T">T</div>' : ''}
            ${airport.ground ? '<div class="badge G">G</div>' : ''}
        `;
	document.body.appendChild(airportUI);

	const airportInfoMenu = document.createElement('div');
	airportInfoMenu.className = 'airport-info-menu';
	document.body.appendChild(airportInfoMenu);

	if (airportUI.querySelector('.badge')) {
		airportUI.style.backgroundColor = "rgba(32, 47, 54, 0.5)";
		airportUI.style.color = "#ffffff";
	}

	function showInfoMenu(badge) {
		const position =
			badge.classList.contains('C') ? (airport.ctr && airport.oceanic ? 'Oceanic' : 'Control') :
			badge.classList.contains('A') ? 'Approach' :
			badge.classList.contains('T') ? 'Tower' :
			badge.classList.contains('G') ? 'Ground' :
			badge.classList.contains('D') ? 'Delivery' :
			'Unknown';

		const atcName = (position === 'Control' || position === 'Oceanic' || position === 'Approach' || position === 'Tower') ?
			airport.towerAtc :
			(position === 'Ground' || position === 'Delivery') ?
			airport.groundAtc :
			null;

		const frequency = position === 'Ground' ? airport.groundfreq : airport.towerfreq;

		airportInfoMenu.style.display = 'block';
		airportInfoMenu.innerHTML = `
                <div class="title">${airport.real_name} ${position}</div>
                <hr class="menu-divider">
                <div class="controller-info-section">
                    <p><strong>ATC:</strong> ${atcName}</p>
                    <p><strong>Freq:</strong> ${frequency}</p>
                </div>
            `;

		const [x, y] = transformCoordinates(airport.coordinates);
		airportInfoMenu.style.left = `${x - (airportUI.offsetWidth / 2)}px`;
		airportInfoMenu.style.top = `${y + airportUI.offsetHeight / 2 + 60}px`;
	}

	function hideInfoMenu() {
		airportInfoMenu.style.display = 'none';
	}

	const controlBadge = airportUI.querySelector('.badge.C');
	const approachBadge = airportUI.querySelector('.badge.A');
	const towerBadge = airportUI.querySelector('.badge.T');
	const groundBadge = airportUI.querySelector('.badge.G');

	function highlightCTR(ctrName) {
		controlAreas.forEach(area => {
			if (area.type === 'polygon' && area.name === ctrName) {
				area.originalFillColor = area.fillColor;
				area.fillColor = 'rgba(0, 255, 125, 0.075)';
				draw();
			}
		});
	}

	function resetCTRHighlight(ctrName) {
		controlAreas.forEach(area => {
			if (area.type === 'polygon' && area.name === ctrName) {
				area.fillColor = area.originalFillColor;
				draw();
			}
		});
	}

	// Funções para destaque de APP
	function highlightAPP(appName) {
		controlAreas.forEach(area => {
			if (area.type === 'polygon' && area.name === appName) {
				area.originalFillColor = area.fillColor;
				area.fillColor = 'rgba(255, 122, 0, 0.1)';
				draw();
			}
		});
	}

	function resetAPPHighlight(appName) {
		controlAreas.forEach(area => {
			if (area.type === 'polygon' && area.name === appName) {
				area.fillColor = area.originalFillColor;
				draw();
			}
		});
	}

	// Eventos para o badge de controle
	if (controlBadge) {
		controlBadge.addEventListener('mouseenter', () => {
			showInfoMenu(controlBadge);
			highlightCTR(airport.ctr); // Destaque CTR
			highlightAPP(airport.app); // Destaque APP se existir
		});
		controlBadge.addEventListener('mouseleave', () => {
			hideInfoMenu();
			resetCTRHighlight(airport.ctr); // Reset CTR
			resetAPPHighlight(airport.app); // Reset APP
		});
	}

	// Eventos para o badge de approach
	if (approachBadge) {
		approachBadge.addEventListener('mouseenter', () => {
			showInfoMenu(approachBadge);
			highlightAPP(airport.app); // Destaque APP
		});
		approachBadge.addEventListener('mouseleave', () => {
			hideInfoMenu();
			resetAPPHighlight(airport.app); // Reset APP
		});
	}

	// Eventos para o badge de tower
	if (towerBadge) {
		towerBadge.addEventListener('mouseenter', () => showInfoMenu(towerBadge));
		towerBadge.addEventListener('mouseleave', hideInfoMenu);
	}

	// Eventos para o badge de ground
	if (groundBadge) {
		groundBadge.addEventListener('mouseenter', () => showInfoMenu(groundBadge));
		groundBadge.addEventListener('mouseleave', hideInfoMenu);
	}

	updatePosition(airportUI, airport);

	window.addEventListener('resize', () => updatePosition(airportUI, airport));
	canvas.addEventListener('mousemove', () => updatePosition(airportUI, airport));
	canvas.addEventListener('wheel', () => updatePosition(airportUI, airport));
}

function resetAllAirportsUI() {
	// Percorre todas as áreas de controle e reseta apenas as do tipo 'Airport'
	controlAreas.forEach(area => {
		if (area.type === 'Airport') {
			// Busca o elemento correspondente à interface do aeroporto
			const airportUIs = document.querySelectorAll(`.airport-ui`); // Seleciona todos os aeroportos

			airportUIs.forEach(airportUI => {
				// Remove event listeners dos badges
				const controlBadge = airportUI.querySelector('.badge.C');
				const towerBadge = airportUI.querySelector('.badge.T');
				const groundBadge = airportUI.querySelector('.badge.G');

				if (controlBadge) {
					controlBadge.removeEventListener('mouseenter', showInfoMenu);
					controlBadge.removeEventListener('mouseleave', hideInfoMenu);
				}
				if (towerBadge) {
					towerBadge.removeEventListener('mouseenter', showInfoMenu);
					towerBadge.removeEventListener('mouseleave', hideInfoMenu);
				}
				if (groundBadge) {
					groundBadge.removeEventListener('mouseenter', showInfoMenu);
					groundBadge.removeEventListener('mouseleave', hideInfoMenu);
				}

				// Remove o elemento da interface do DOM
				airportUI.remove();
			});
		}
	});

	// Remove event listeners globais (opcional, pode ser gerido caso tenha múltiplos aeroportos)
	window.removeEventListener('resize', updatePosition);
	canvas.removeEventListener('mousemove', updatePosition);
}

function displayAirports() {
	resetAllAirportsUI(); // Reseta todos os aeroportos antes de exibi-los
	controlAreas.forEach(area => {
		if (area.type === 'Airport') {
			createAirportUI(area);
		}
	});
}

// Exibe os aeroportos na inicialização
displayAirports();

// Evento para arrastar o mapa
canvas.addEventListener('mousedown', (e) => {
	isDragging = true;
	startX = e.clientX - offsetX;
	startY = e.clientY - offsetY;
});

canvas.addEventListener('mousemove', (e) => {
	if (isDragging) {
		offsetX = e.clientX - startX;
		offsetY = e.clientY - startY;
		draw();
	}
});

canvas.addEventListener('mouseup', () => {
	isDragging = false;
});

let isZooming = false;

canvas.addEventListener('wheel', (e) => {
	e.preventDefault();

	if (!isZooming) {
		isZooming = true;

		requestAnimationFrame(() => {
			// Captura a posição do mouse relativa ao canvas
			const mouseX = (e.clientX - canvas.getBoundingClientRect().left - offsetX) / scale;
			const mouseY = (e.clientY - canvas.getBoundingClientRect().top - offsetY) / scale;

			// Ajusta a escala e aumenta a taxa de zoom
			const zoomRate = 0.005; // Aumente o valor para um zoom mais rápido
			const zoomFactor = e.deltaY * -zoomRate;

			// Define um limite de zoom out mínimo e máximo
			const minScale = 0.5; // Limite de zoom out
			const maxScale = 10; // Limite de zoom in

			// Calcula a nova escala e aplica os limites
			const newScale = Math.min(Math.max(minScale, scale + zoomFactor), maxScale);

			// Se o zoom estiver dentro dos limites, ajusta o offset; caso contrário, mantém o último offset
			if (newScale !== scale) {
				// Atualiza a escala
				scale = newScale;

				// Calcula o novo offset para centralizar o zoom no ponto do mouse
				offsetX = e.clientX - mouseX * scale;
				offsetY = e.clientY - mouseY * scale;
			}

			console.log(scale);
			draw();

			// Libera o zooming para o próximo evento
			isZooming = false;
		});
	}
});

let lastMouseX = 0;
let lastMouseY = 0;

// Captura a posição do mouse no canvas
canvas.addEventListener('mousemove', (e) => {
	lastMouseX = e.clientX;
	lastMouseY = e.clientY;
});

function toggleSettingsMenu() {
	const settingsMenu = document.getElementById('settingsMenu');
	settingsMenu.style.display = settingsMenu.style.display === 'none' || settingsMenu.style.display === '' ? 'block' : 'none';
}

function refreshUI() {
	// Limpa e redesenha o canvas
	draw();

	// Remove todos os elementos da UI (exemplo de classes específicas)
	document.querySelectorAll('.airport-ui').forEach(el => el.remove());

	// Redesenha os elementos da interface do usuário
	displayAirports();
}

function updateATCCount() {
    const atcNumberElement = document.querySelector('.online-number');
    if (atcNumberElement) {
        atcNumberElement.textContent = onlineATC;
    }
}

function ATCOnlinefuncion(atcList) {
	console.log('Iniciando função de teste ATCOnlineFunction');
	onlineATC = 0;

	// Desativa todas as áreas e aeroportos ao iniciar
	controlAreas.forEach(area => {
		if (area.type === 'Airport') {
			area.tower = false;
			area.ground = false;
			area.towerAtc = '';
			area.groundAtc = '';
			area.scale = area.originalscale;
			console.log(`Desativado ${area.name} - Tower: ${area.tower}, Ground: ${area.ground}`);
		} else if (area.type === 'polygon') {
			area.active = false; // Desativa TMAs/CTRs inicialmente
		}
	});

	// Processa cada objeto da lista ATC
	atcList.forEach(atcData => {
		const { holder, claimable, airport, position } = atcData;
		
		if (claimable) return;
		
		// Encontra a área correspondente ao aeroporto
		controlAreas.forEach(area => {
			
			if (area.type === 'Airport' && area.real_name === airport) {
				console.log('oooo');
				area.scale = 0; // Reduz o scale ao ativar uma posição no aeroporto
				if (position === "tower") {
					area.tower = true;
					area.towerAtc = holder;
					onlineATC += 1;

					// Ativa a TMA correspondente, se aplicável
					controlAreas.forEach(tmaArea => {
						if (tmaArea.type === 'polygon' && tmaArea.name === area.tma) {
							tmaArea.active = true;
							console.log(`TMA ${tmaArea.name} ativada para ${area.name}`);
						}
					});
				}

				if (position === "ground") {
					area.ground = true;
					area.groundAtc = holder;
					onlineATC += 1;
				}

				// Ativa a CTR correspondente, se aplicável
				if (area.ctr) {
					controlAreas.forEach(ctrArea => {
						if (ctrArea.type === 'polygon' && ctrArea.name === area.ctr) {
							ctrArea.active = true;
							console.log(`CTR ${ctrArea.name} ativada para ${area.name}`);
						}
					});
				}

				console.log(`Atualizado ${airport} - Tower Ativo: ${area.tower}, Ground Ativo: ${area.ground}, ATC: ${holder}`);
			}
		});
	});

	updateATCCount();
	refreshUI();
}

ATCOnlinefuncion(PTFSAPI);

// Função para buscar dados do endpoint e atualizar o estado de ATC
function fetchATCDataAndUpdate() {
    fetch('https://ptfs.xyz/api/controllers')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao buscar dados: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Atualiza a variável PTFSAPI com os dados recebidos
			console.log(data)
            PTFSAPI = data;

            // Executa a função de atualização com os dados recebidos
            ATCOnlinefuncion(PTFSAPI);
        })
        .catch(error => {
            console.error('Erro ao buscar os dados ATC:', error);
        });

		const time = getTime()
		document.querySelector('.mapUpdateTime .time').textContent = ` ${time}`;
}

setInterval(fetchATCDataAndUpdate, 30000);

fetchATCDataAndUpdate();

function ActiveAllATCfunction() {
	const list = generateATCsListFromAreas();
	const atcInfoTextarea = document.getElementById('atcInfo');
	atcInfoTextarea.value = list;
	ATCOnlinefuncion();
	refreshUI();
}

function resetAllATCfuntion() {
	const atcInfoTextarea = document.getElementById('atcInfo');
	atcInfoTextarea.value = "";
	controlAreas.forEach(area => {
		if (area.type === 'Airport') {
			area.tower = false; // Desativa a torre
			area.ground = false; // Desativa o ground
			area.towerAtc = ''; // Limpa o ATC da torre
			area.groundAtc = ''; // Limpa o ATC do ground
			area.scale = area.originalscale; // Opcional: redefinir a escala para não mostrar
			console.log(`Desativado ${area.name} - Tower: ${area.tower}, Ground: ${area.ground}`);
		}
	});
	ATCOnlinefuncion();
	refreshUI();
}

// Function to generate the list of ATCs in the specified format
function generateATCsListFromAreas() {
	// List to collect ATCs in the desired format
	let atcsList = [];

	// Filter areas by type 'Airport' and extract their ATCs
	controlAreas.forEach(area => {
		if (area.type === "Airport" && area.atcs && area.atcs.length > 0) {
			area.atcs.forEach(atc => {
				// Add the ATC name followed by '@' on a new line
				atcsList.push(atc);
				atcsList.push("@");
			});
		}
	});

	// Juntar os ATCs em uma string
	const formattedATCs = atcsList.join("\n");
	return formattedATCs;
}

generateATCsListFromAreas()

function redirectToDiscord() {
	window.open('https://discord.gg/8cQAguPjkh');
}

function redirectToGitHub() {
	window.open('https://github.com/tiaguinho2009/24SPY');
}

function redirectToWiki() {
	window.open('https://github.com/tiaguinho2009/24SPY/wiki');
}

function saveToLocalStorage() {
    localStorage.setItem('settingsValues', JSON.stringify(settingsValues));
    localStorage.setItem('websiteInfo', JSON.stringify(websiteInfo));
    console.log('Dados salvos no localStorage.');
}

function loadFromLocalStorage() {
    const storedSettings = localStorage.getItem('settingsValues');
    const storedWebsiteInfo = localStorage.getItem('websiteInfo');

    if (storedSettings) {
        Object.assign(settingsValues, JSON.parse(storedSettings));
        console.log('settingsValues carregado do localStorage:', settingsValues);

        // Atualiza os checkboxes com base nos valores de settingsValues
        for (const key in settingsValues) {
            if (settingsValues.hasOwnProperty(key)) {
                const checkbox = document.getElementById(key);
                if (checkbox) {
                    checkbox.checked = settingsValues[key];
                }
            }
        }
    } else {
        console.log('Nenhum settingsValues encontrado no localStorage. Usando valores padrão.');
    }

    if (storedWebsiteInfo) {
        Object.assign(localInfo, JSON.parse(storedWebsiteInfo));
        console.log('websiteInfo carregado do localStorage:', websiteInfo);
    } else {
        console.log('Nenhum websiteInfo encontrado no localStorage. Usando valores padrão.');
    }
}
loadFromLocalStorage();

function onCheckBoxChange(checkbox) {
	console.log(checkbox.id);
	settings.forEach(setting => {
		if (setting === checkbox.id) {
			settingsValues[setting] = checkbox.checked; // Atualiza o valor correspondente na configuração
			console.log(settingsValues[setting], checkbox.checked);
			saveToLocalStorage()
		}
	});
}

function getTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    return timeString;
}

function copyCoordinatesToClipboard(x, y) {
	const coordsText = `[${x.toFixed(2)}, ${y.toFixed(2)}]`;
	navigator.clipboard.writeText(coordsText).then(() => {
		console.log(`Coordenadas copiadas: ${coordsText}`);
	}).catch(err => {
		console.error('Falha ao copiar para a área de transferência', err);
	});
}

window.addEventListener('keydown', (e) => {
	if (e.key === 'ç') { // Verifica se a tecla pressionada é "ç"
		const mouseX = (lastMouseX - canvas.getBoundingClientRect().left - offsetX) / scale;
		const mouseY = (lastMouseY - canvas.getBoundingClientRect().top - offsetY) / scale;
		copyCoordinatesToClipboard(mouseX, mouseY);
	}
});

// Inicializa o canvas
resizeCanvas();