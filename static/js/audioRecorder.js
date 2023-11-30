let mediaRecorder;
let chunks = [];
let audioBlob;

function startAudioRecording() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia supported');
        
        chunks = [];

        navigator.mediaDevices.getUserMedia({audio: true})
            .then((stream) => {
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.onstop = async function() {
                    audioBlob = new Blob(chunks, {type: 'audio/wav'} )
                    bufferArray = await convertBlobToUint8(audioBlob);

                    ws.send(bufferArray)
                    // ws.send(JSON.stringify(message));
                    console.log('Recording stopped.')
                }
                mediaRecorder.ondataavailable = function(event) {
                    if (event.data.size > 0)
                        chunks.push(event.data)
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