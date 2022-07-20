import zh from './zh.json';
import en from './en.json';

export const getLocale = (type: string) => ({ zh, en }[type]);
