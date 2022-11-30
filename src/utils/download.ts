export const download = (name: string, href: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', href);
  element.setAttribute('download', name);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const downloadByBuffer = (name: string, data: ArrayBuffer) => {
  const blob = new Blob([data]);
  const url = URL.createObjectURL(blob);
  download(name, url);
};
