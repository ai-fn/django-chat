import WaveSurfer from 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js'

let playedWaveserfers = [];

export function drawAudio(audiofile_path, canvas_id) {
    const parentDiv = document.getElementById(`canvas-${canvas_id}`);
    const currentTimeLabel = document.createElement('span');
    currentTimeLabel.classList.add('help-text')

    const wavesurfer = WaveSurfer.create({
        height: 30,
        width: 150,
        container: `#canvas-${canvas_id}`,
        waveColor: '#4F4A85',
        progressColor: '#383351',
        cursorWidth: 0,
        barWidth: 3,
        barHeight: 0.9,
        barRadius: 1,
        url: audiofile_path,
        dragToSeek: true,
    });

    const ws = {
        wavesurfer: wavesurfer,
        parentDiv: parentDiv,
        currentTimeLabel: currentTimeLabel
    }

    wavesurfer.once('ready', () => {
        const button = document.getElementById(`playBtn-${canvas_id}`)
        const play = document.getElementById(`playSvg-${canvas_id}`);
        const pause = document.getElementById(`pauseSvg-${canvas_id}`);
        parentDiv.insertAdjacentElement("beforeend", currentTimeLabel);

        currentTimeLabel.textContent = formatTime(wavesurfer.getDuration());
        button.onclick = () => wavesurfer.playPause();

        wavesurfer.on('play', () => {
            play.classList.replace('shown', 'not-shown');
            pause.classList.replace('not-shown', 'shown');
            if (playedWaveserfers.length > 0) {
                playedWaveserfers.forEach((el) => {
                    if (el.wavesurfer != wavesurfer){
                        el.wavesurfer.stop();
                    }
                })
            }
            playedWaveserfers = [];
            playedWaveserfers.push(ws);
        })
        wavesurfer.on('pause', () => {
            play.classList.replace('not-shown', 'shown');
            pause.classList.replace('shown', 'not-shown');
        })
    })
    wavesurfer.on('interaction', () => {
        wavesurfer.play();
    });
    wavesurfer.on("audioprocess", () => {
        if (wavesurfer.isPlaying()){
            let currentTime = Math.floor(wavesurfer.getCurrentTime());
            currentTimeLabel.textContent = formatTime(currentTime);
            return
        }
        currentTimeLabel.textContent = formatTime(wavesurfer.getDuration());
    });
}

function formatTime(seconds) {
    let date = new Date(null);
    date.setSeconds(seconds);
    return date.toLocaleTimeString('en-US', { minute: '2-digit', second: '2-digit' });
}

