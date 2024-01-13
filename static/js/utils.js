export function urlify(text) {
  if (text != null) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, function(url) {
      return `<a href="${url}">${url}</a>`;
    })
  }
  return text;
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
