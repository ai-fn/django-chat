export function urlify(text) {
  if (text != null) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, function(url) {
      return `<a href="${url}">${url}</a>`;
    })
  }
  return text;
}

export function capitalizeString(string) {
  let result;
  let firstCharacter = string.charAt(0);

  firstCharacter = firstCharacter.toUpperCase();
  result = firstCharacter + string.slice(1);
  
  return result;
}

export function getPreviewMessage(selectMessage){

	let preview = "";
	let isMedia = false;
	let fileTypeImg = "";
	let text = selectMessage.body;
	let localUrl = window.location.origin;

  if (selectMessage.attachments.length > 0) {
		let attach = selectMessage.attachments[0];
		isMedia = ["image", "video"].includes(attach.file_type);
		if (isMedia) {
			preview = `<img src="${attach.file}" width="32" height="32" class="pictogram" draggable="false">`;
		} else {
			fileTypeImg = `<img src="${localUrl}/static/attach.png" width="32" height="32" alt="" class="emoji emoji-small" draggable="false">`;
		}

		if (text == null || text.length == 0)
			text = isMedia ? capitalizeString(attach.file_type) : attach.name;

	}
	else if (selectMessage.voice_file != null || selectMessage.video_file != null) {
		fileTypeImg = `<img src="${localUrl}/static/voice.png" width="32" height="32" class="emoji emoji-small" draggable="false">`;
		if (text == null || text.length == 0)
			text = selectMessage.voice_file != null ? "Voice message" : "Video message";
	}

  return { isMedia, text, fileTypeImg, preview };
}

const maxVisibleCount = 4;
const baseClipPath = `<spansvg height="0" width="0"><defs><clipPath id="clipPath"><path></path></clipPath></defs></svg></span>`;
const padding = 2;

let wrapperExtraClass = "sNpxwL0ihB0aXnfphNmp";
export function updateClipPath(count){
	let maxCount = count >= maxVisibleCount ? maxVisibleCount : count;
	let height = document.querySelector(".II9Qj_b_XQlgwGAOoy7u").clientHeight;
	let clipHeight = count >= maxVisibleCount ? 5.5 : height / count - padding;

	let wrapper = document.querySelector(`.${wrapperExtraClass}`);
	let span = wrapper.querySelector("span");
	
	let dPath = (index) => 
		`M0,${index > 0 ? (Math.ceil(height / maxCount)) * index : 0}a1,1,0,0,1,
		2,0v${clipHeight}a1,1,0,0,1,-2,0Z`;


	if (count == 1){
		span.remove();
		wrapperExtraClass = "QpNjYZM0KJrGrocs69__";
	} else {
		wrapperExtraClass = "sNpxwL0ihB0aXnfphNmp";
		if (!span){
			wrapper.insertAdjacentHTML("beforeend", baseClipPath);
			span = wrapper.querySelector("span");
		}
		let result = "";
		for (let i = 0; i < count; i++)
			result += dPath(i);
		let path = span.querySelector("path");
		path.setAttribute("d", result);
		path.parentElement.setAttribute("id", `clipPath${count}`);
	}
	wrapper.classList.replace(wrapper.classList.item(0), wrapperExtraClass);
}

export function setClipStyle(count, index){
	const maxCount = count >= maxVisibleCount ? maxVisibleCount : count;
	const fullHeight = document.querySelector(".II9Qj_b_XQlgwGAOoy7u").clientHeight - 1;
	const eachHeight = Math.ceil(fullHeight / maxCount);
	const sliderHeight = fullHeight + (count - maxCount) * eachHeight;
	const currentY = sliderHeight - eachHeight * (count - index);
	let sliderTranslateY = -index * (eachHeight + padding) + fullHeight/2 - eachHeight/2;
	
	if (sliderTranslateY > 0) {
        sliderTranslateY = 0;
    } else if (sliderTranslateY < -(count * eachHeight - fullHeight)) {
        sliderTranslateY = -(count * eachHeight - fullHeight);
    }

	const style = `--height: ${eachHeight}px; --translate-y: ${currentY}px; --translate-track: 0px; height: ${eachHeight}px; transform: translateY(${currentY}px);`;
	const composerStyle = `height: ${sliderHeight}px; transform: translateY(${sliderTranslateY}px); clip-path: url("#clipPath${count}");`;
	document.querySelector(".YX_iyQuDtga6uKXRQqR0").style = style;
	document.querySelector(`.${wrapperExtraClass}`).style = composerStyle;
}

export function setClassesToInputParentDiv(){
	document.querySelectorAll("div input.form-control").forEach(el => {
		el.parentElement.classList.add("input-group", "with-label");
		el.value ? el.parentElement.classList.add("touched") : null;
	})
}

export function inputIsTouched(e) {
	const target = e.target;
	if (target.value.length > 0) {
	  target.parentElement.classList.add("touched");
	  return;
	}
	target.parentElement.classList.remove("touched");
}
