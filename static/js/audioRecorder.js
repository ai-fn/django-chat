let mediaRecorder;
let chunks = [];
let audioBlob;
let message;

function startAudioRecording(ws) {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia supported');
        
        chunks = [];

        navigator.mediaDevices.getUserMedia({audio: true})
            .then((stream) => {
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.onstop = function() {
                    console.log('Recording stopped.');
                }
                mediaRecorder.ondataavailable = function(event) {
                    if (event.data.size > 0)
                        chunks.push(event.data)

                    const reader = new FileReader();
                    audioBlob = new Blob(chunks, {type: 'audio/wav'});

                    reader.onload = () => {
                        const arrayBuffer = reader.result;
                        const base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
                        message = {
                            action: 'audio-message',
                            audioFile: base64String,
                        }
                        ws.send(JSON.stringify(message));
                    }
                    reader.readAsArrayBuffer(audioBlob);
                }
                mediaRecorder.start();
            })
            .catch((err) => {
                console.log(`The following getUserMedia error occurred: ${err}`)
            });
    } else {
        alert("getUserMedia not supported on your browser")
    }
}

function stopAudioRecording() {
    if (mediaRecorder && mediaRecorder.state == 'recording'){
        mediaRecorder.stop();
    }
}

async function convertBlobToUint8(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    // const decoder = new TextDecoder('utf-8');
    // const dataString = decoder.decode(uint8Array);
    // return dataString;
    return uint8Array;
}