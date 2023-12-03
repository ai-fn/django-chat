export function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    text.replace(urlRegex, function(url) {
      return `<a href="${url}">${url}</a>`;
    })
}
