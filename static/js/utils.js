export function urlify(text) {
  if (text != null) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, function(url) {
      return `<a href="${url}">${url}</a>`;
    })
  }
  return text;
}
