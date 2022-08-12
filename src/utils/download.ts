export const download = (name: string, href: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', href);
  element.setAttribute('download', name);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
