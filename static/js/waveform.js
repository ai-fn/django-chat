function playAudio(audiofile_path){
     let audio = new Audio(audiofile_path);
     audio.play();
 }

 window.AudioContext = window.AudioContext || window.webkitAudioContext;
 const audioContext = new AudioContext();
 const drawAudio = (url, canvas_id) => {
   fetch(url)
     .then(response => response.arrayBuffer())
     .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
     .then(audioBuffer => draw(normalizeData(filterData(audioBuffer)), canvas_id));
 };

 const filterData = audioBuffer => {
   const rawData = audioBuffer.getChannelData(0);
   const samples = 70;
   const blockSize = Math.floor(rawData.length / samples);
   const filteredData = [];
   for (let i = 0; i < samples; i++) {
     let blockStart = blockSize * i;
     let sum = 0;
     for (let j = 0; j < blockSize; j++) {
       sum = sum + Math.abs(rawData[blockStart + j]);
     }
     filteredData.push(sum / blockSize);
   }
   return filteredData;
 };

 const normalizeData = filteredData => {
     const multiplier = Math.pow(Math.max(...filteredData), -1);
     return filteredData.map(n => n * multiplier);
 }

 const draw = (normalizedData, canvas_id) => {

   const canvas = document.getElementById(`canvas-${canvas_id}`);
   const dpr = window.devicePixelRatio || 1;
   const padding = 0;
   canvas.width = canvas.offsetWidth * dpr;
   canvas.height = (canvas.offsetHeight + padding * 1.5) * dpr;
   const ctx = canvas.getContext("2d");
   ctx.scale(dpr, dpr);
   ctx.translate(0, canvas.offsetHeight / 2 + padding);


   const width = canvas.offsetWidth / normalizedData.length;
   for (let i = 0; i < normalizedData.length; i++) {
     const x = width * i;
     let height = normalizedData[i] * canvas.offsetHeight - padding;
     if (height < 0) {
         height = 0;
     } else if (height > canvas.offsetHeight / 2) {
         height = height > canvas.offsetHeight / 2;
     }
     drawLineSegment(ctx, x, height, width, (i + 1) % 2);
   }
 };

 const drawLineSegment = (ctx, x, height, width, isEven) => {
   console.log(x, "x")
   height = height > 3 ? height / 2 : height + 1.5;
   ctx.lineWidth = 2;
   ctx.strokeStyle = "#fff";
   ctx.beginPath();
   height = isEven ? height : -height;
   ctx.moveTo(x, 0);
   ctx.lineTo(x, height);
   ctx.lineTo(x, -height);
   ctx.stroke();
 };
