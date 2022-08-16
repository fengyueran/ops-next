export const getFileName = (url: string) => {
  const parts = url.split('/');
  return parts[parts.length - 1];
};
