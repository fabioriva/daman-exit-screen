# Daman Exit Screen

Dashboard per monitorare 10 uscite e le code nord/sud dell'impianto Burji Daman.
Il servizio API legge il PLC tramite `node-snap7`; SvelteKit espone il proxy
`/api` e il browser aggiorna lo schermo ogni 1,5 secondi.

## Installazione

Usare Node.js 24.14.0, indicato in `.nvmrc` (richiesto Node >=24.14.0 e <25).
Con nvm, dalla radice del repository:

```sh
nvm install
nvm use
npm ci
```

Se `.env` non esiste, crearlo dal modello:

```sh
cp .env.example .env
```

Modificare `.env` con i parametri dell'impianto. Se il file esiste già,
confrontarlo con `.env.example` e aggiungere le variabili mancanti senza sovrascriverlo.
Le variabili già presenti nell'ambiente hanno precedenza sul file `.env`.

`node-snap7` e `uWebSockets.js` contengono moduli nativi. Dopo un cambio di
versione Node, rieseguire `npm ci`. Per il solo errore ABI di `node-snap7`:

```sh
npm rebuild node-snap7
```

Se è necessaria la compilazione locale, su Linux servono Python 3, make e un
compilatore C/C++. Non copiare `node_modules` tra versioni Node o piattaforme diverse.

## Configurazione

L'API carica `.env` dalla radice del repository anche quando viene avviata
da un'altra directory. I parametri non validi interrompono l'avvio con un errore.
I valori predefiniti mantengono la configurazione originale dell'impianto.

| Variabile | Default | Significato |
| --- | --- | --- |
| `PUBLIC_API` | Da impostare | URL completo dell'API PLC, es. `http://127.0.0.1:3001/api/data` |
| `API_PORT` | `3001` | Porta dell'API PLC |
| `PLC_IP` | `192.168.24.2` | Indirizzo IPv4 del PLC |
| `PLC_RACK` | `0` | Rack, da 0 a 7 |
| `PLC_SLOT` | `1` | Slot, da 0 a 31 |
| `PLC_POLLING_MS` | `500` | Pausa in millisecondi dopo ogni lettura o tentativo di connessione |
| `PLC_DB_NUMBER` | `182` | Data block da leggere |
| `PLC_START` | `0` | Offset iniziale in byte |
| `HOST` | Vedi `.env.example` | Interfaccia del server SvelteKit in produzione |
| `PORT` | `3000` | Porta del server SvelteKit in produzione |

I numeri vanno espressi in decimale. La lettura resta fissata a 80 byte,
interpretati come 40 interi signed a 16 bit big endian:

| Indici | Contenuto |
| --- | --- |
| 0–9 | Uscite nord |
| 10–19 | Coda nord |
| 20–29 | Uscite sud |
| 30–39 | Coda sud |

`PUBLIC_API` viene incorporata nella build: dopo averla modificata è necessario
ricostruire il frontend. Per modifiche ai parametri PLC riavviare il servizio API.
In sviluppo nodemon non osserva `.env`: riavviarlo o digitare `rs`.

## Sviluppo

Avviare in due terminali, dalla radice del repository:

```sh
npm run api
```

```sh
npm run dev
```

Aprire l'indirizzo mostrato da Vite. Il PLC deve essere raggiungibile dalla
macchina che esegue l'API.

## Produzione

Per installazione su Raspberry Pi, avvio automatico, aggiornamenti e rollback,
seguire la [procedura di deploy Raspberry Pi](#deploy-su-raspberry-pi).

```sh
npm run build
```

Avviare l'API e il frontend come processi separati:

```sh
node api/index.js
```

```sh
npm start
```

`npm start` carica `.env` anche per il server SvelteKit. Con PM2 già installato,
la configurazione inclusa avvia entrambi i servizi:

```sh
pm2 start ecosystem.config.cjs
```

## Stato e gestione dei guasti

`GET /api/data` restituisce `{ data, online, lastUpdated }`, dove `lastUpdated`
è il timestamp Unix in millisecondi dell'ultima lettura completa, oppure `null`.
In caso di errore PLC l'API conserva i dati precedenti e imposta `online: false`.

Lo schermo distingue attesa iniziale, PLC scollegato, API non disponibile e
dati più vecchi di 5 secondi. I valori non aggiornati diventano grigi e smettono
di lampeggiare. Il proxy restituisce `502` per errori del backend o risposte
non valide e `504` se la richiesta supera 3 secondi.

## Verifiche

```sh
npm test
npm run check
npm run build
```

I test simulano il PLC e le risposte HTTP; non richiedono un impianto collegato.
`npm run check` controlla Svelte e il codice sotto `src`, senza includere `api`.
La comunicazione e la corrispondenza dei dati con l'impianto richiedono una prova
con il PLC reale.

## Deploy su Raspberry Pi

Questa procedura prevede una Raspberry Pi con Raspberry Pi OS **64 bit**, accesso
SSH e un utente ordinario con `sudo`. Usare sempre lo stesso utente per clonare
il progetto, installare Node e gestire PM2. I comandi si eseguono sulla Raspberry,
salvo diversa indicazione; procedere al blocco successivo solo se il precedente
termina senza errori. Sostituire i segnaposto `URL_REPOSITORY`, `TAG_O_COMMIT`,
`NUOVO_TAG_O_COMMIT` e `IP_RASPBERRY` prima di eseguire i relativi comandi.

La procedura pubblica la dashboard sulla porta 3000 della rete locale e mantiene
due processi: `api` per il PLC e `app` per SvelteKit. Non configura il browser
in modalità kiosk né un dominio HTTPS.

### 1. Controllare sistema e rete

```sh
cat /etc/os-release
uname -m
getconf LONG_BIT
dpkg --print-architecture
```

Attesi: `aarch64`, `64` e `arm64`. Se il sistema è a 32 bit (`armv7l` / `armhf`),
questa procedura non si applica: predisporre prima un sistema 64 bit compatibile
con il modello di Raspberry. Non reinstallare un server esistente senza averne
salvato configurazione e dati.

Raspberry Pi OS è disponibile a 64 bit e Node 24.14.0 fornisce il binario Linux
ARM64. Riferimenti: [Raspberry Pi OS](https://www.raspberrypi.com/software/operating-systems/)
e [download Node 24.14.0](https://nodejs.org/download/release/v24.14.0/).
Il pacchetto `uWebSockets.js` del progetto include `uws_linux_arm64_137.node`;
il caricamento effettivo verrà verificato al punto 4.

Assegnare alla Raspberry un indirizzo stabile, tramite prenotazione DHCP o
configurazione di rete dell'impianto. Deve raggiungere il PLC configurato in
`.env` sulla porta TCP 102. Non modificare l'indirizzo del PLC per il deploy.

```sh
sudo apt update
sudo apt install -y git curl ca-certificates build-essential python3 pkg-config netcat-openbsd
```

### 2. Installare Node con nvm

Se nvm non è già installato, scaricare ed eseguire l'installer ufficiale:

```sh
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh -o /tmp/daman-nvm-install.sh
bash /tmp/daman-nvm-install.sh
```

Riaprire la sessione SSH, quindi:

```sh
command -v nvm
nvm install 24.14.0
nvm use 24.14.0
node -p 'process.version + " " + process.platform + " " + process.arch'
```

Atteso: `v24.14.0 linux arm64`. Non eseguire npm con `sudo`: nvm installa Node
nella directory dell'utente. Riferimento: [installazione ufficiale nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

### 3. Recuperare la release e configurare l'ambiente

Prima del deploy, le modifiche da distribuire devono essere committate e
pubblicate nel repository remoto. Le modifiche presenti solo sulla macchina
di sviluppo non vengono trasferite con `git clone`.

```sh
mkdir -p ~/apps
cd ~/apps
git clone URL_REPOSITORY daman-exit-screen
cd daman-exit-screen
git checkout --detach TAG_O_COMMIT
nvm install
nvm use
git rev-parse HEAD
```

Registrare il commit distribuito. Per un repository privato predisporre prima
l'accesso Git dell'utente di deploy. Se esiste già un checkout, conservarne
`.env` e modifiche locali, quindi usare la procedura di aggiornamento più sotto.

Solo per una nuova installazione senza `.env`:

```sh
cp .env.example .env
chmod 600 .env
nano .env
```

Configurazione di esempio, da verificare con l'impianto:

```dotenv
PUBLIC_API=http://127.0.0.1:3001/api/data
API_PORT=3001
PLC_IP=192.168.24.2
PLC_RACK=0
PLC_SLOT=1
PLC_POLLING_MS=500
PLC_DB_NUMBER=182
PLC_START=0
HOST=0.0.0.0
PORT=3000
```

`PUBLIC_API` punta al backend sulla stessa Raspberry. Se si cambia `API_PORT`,
aggiornare anche questo URL. Impostare `.env` **prima della build**, perché
`PUBLIC_API` viene incorporata nel codice compilato. Controllare che eventuali
variabili esportate nella shell non sovrascrivano involontariamente `.env`.

### 4. Installare e verificare sulla Raspberry

```sh
npm ci --include=dev
node --input-type=module -e 'import snap7 from "node-snap7"; import * as uWS from "uWebSockets.js"; new snap7.S7Client(); if (typeof uWS.App !== "function") process.exit(1); console.log("Moduli nativi OK");'
npm test
npm run check
npm run build
```

Servono anche le devDependencies per compilare SvelteKit. Installare direttamente
sulla Raspberry: non trasferire `node_modules` dal PC. La build può richiedere
più tempo sui modelli con poca RAM; se termina con `Killed`, controllare prima
la memoria disponibile con `free -h`.

Se `node-snap7` segnala un errore di ABI, verificare `nvm use`, poi eseguire:

```sh
npm rebuild node-snap7
```

Ripetere la verifica dei moduli nativi prima di proseguire. Per errori di
caricamento di `uWebSockets.js`, controllare architettura, versione Node e
messaggio originale; il solo rebuild di `node-snap7` non corregge questo modulo.

### 5. Verificare il collegamento al PLC

Con l'indirizzo effettivo del PLC:

```sh
nc -vz -w 3 192.168.24.2 102
node api/index.js
```

In un secondo terminale SSH:

```sh
curl --fail --max-time 5 http://127.0.0.1:3001/api/data
```

Attesi: 40 valori, `online: true` e `lastUpdated` numerico che avanza nelle
richieste successive. La sola apertura della porta 102 non dimostra che rack,
slot e DB siano corretti. Confrontare anche i valori con quelli dell'impianto.
Un'API che restituisce HTTP 200 con `online: false` non supera questa verifica.

Terminare il processo manuale con `Ctrl+C` prima di avviarlo tramite PM2.

### 6. Avviare e abilitare il riavvio automatico

```sh
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 status
curl --fail --max-time 5 http://127.0.0.1:3000/api
curl --fail --max-time 5 -o /dev/null http://127.0.0.1:3000/
```

I processi `api` e `app` devono risultare `online`. Controllare nuovamente i
campi `online` e `lastUpdated` della risposta `/api`: lo stato PM2 indica solo
che il processo è in esecuzione.

Aprire da un browser nella rete dell'impianto:

```text
http://IP_RASPBERRY:3000
```

Se lo schermo è collegato alla Raspberry e dispone di un ambiente desktop,
aprire `http://127.0.0.1:3000` nel browser locale.

Abilitare il ripristino dei processi al boot:

```sh
pm2 startup systemd
```

Eseguire esattamente il comando con `sudo` stampato da PM2: include utente,
home e percorso della versione Node installata con nvm. Poi salvare la lista:

```sh
pm2 save
```

Questa sequenza segue la [procedura ufficiale PM2](https://pm2.keymetrics.io/docs/usage/startup/).
Non avviare una seconda istanza PM2 con `sudo pm2 start`.

Durante una finestra concordata, riavviare la Raspberry:

```sh
sudo reboot
```

Dopo la riconnessione SSH, eseguire `pm2 status`, ripetere le richieste HTTP e
verificare che il browser mostri `PLC connected` con dati aggiornati. Un avvio
senza rete deve recuperare automaticamente quando il PLC torna raggiungibile.

### 7. Aggiornare una release

La procedura seguente prevede un'interruzione del servizio. Prima di iniziare,
verificare che `git status --short` non mostri modifiche locali da conservare.
Eseguire i blocchi nella stessa sessione e annotare il commit precedente anche
separatamente, per poterlo recuperare in caso di disconnessione SSH.

```sh
cd ~/apps/daman-exit-screen
nvm use
git status --short
git rev-parse HEAD
DEPLOY_PREVIOUS_REV=$(git rev-parse HEAD)
git fetch --tags origin
cp -p .env ".env.backup.$(date +%Y%m%d-%H%M%S)"
pm2 stop api app
git checkout --detach NUOVO_TAG_O_COMMIT
```

Confrontare `.env.example` con il proprio `.env` e integrare le nuove variabili.
Poi:

```sh
nvm install
nvm use
npm ci --include=dev
npm test
npm run check
npm run build
```

Solo se tutti i comandi riescono:

```sh
pm2 restart ecosystem.config.cjs --update-env
curl --fail --max-time 5 http://127.0.0.1:3000/api
pm2 status
pm2 save
```

Verificare timestamp, valori e schermata come al primo deploy. Se una verifica
fallisce, non considerare concluso l'aggiornamento: correggere il problema o
eseguire il rollback. Se cambia la versione Node, reinstallare PM2 sotto quella
versione e rigenerare il servizio di boot seguendo `pm2 unstartup` e
`pm2 startup systemd`, eseguendo i comandi stampati da PM2, quindi `pm2 save`.

### 8. Rollback e diagnostica

Per tornare al commit annotato, nella stessa sessione dell'aggiornamento:

```sh
pm2 stop api app
git checkout --detach "$DEPLOY_PREVIOUS_REV"
nvm install
nvm use
npm ci --include=dev
npm test
npm run check
npm run build
pm2 restart ecosystem.config.cjs --update-env
curl --fail --max-time 5 http://127.0.0.1:3000/api
pm2 save
```

Se la sessione è cambiata, sostituire `$DEPLOY_PREVIOUS_REV` con il commit
precedentemente annotato. Ripristinare anche il backup di `.env` prima della
build se l'aggiornamento ne ha cambiato valori incompatibili. Interrompersi al
primo errore anche durante il rollback.

Comandi utili per la diagnosi:

```sh
pm2 describe api
pm2 describe app
pm2 logs api --err --lines 100 --nostream
pm2 logs app --err --lines 100 --nostream
ss -ltnp
free -h
df -h
```

La configurazione PM2 attuale scarta stdout tramite `out_file: /dev/null`:
i log Pino sulla connessione PLC non sono quindi conservati. Per osservarli,
fermare `api` in PM2 e avviare temporaneamente `node api/index.js` in primo
piano; terminarlo prima di riavviare `api` con PM2.

La procedura è stata preparata sulla configurazione del repository; il deploy
ARM64, il riavvio automatico e la comunicazione con il PLC vanno verificati
sulla Raspberry di destinazione.
