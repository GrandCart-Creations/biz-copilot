import tinycolor from 'tinycolor2';

export const BRAND_PRIMARY = '#005C70';
export const BRAND_ACCENT = '#00BFA6';

const isValidHex = (value) => /^#([0-9A-F]{3}){1,2}$/i.test(value || '');

export const getPrimaryColor = (company) => {
  const customColor = company?.branding?.primaryColor;
  if (customColor && isValidHex(customColor)) {
    return customColor;
  }
  return BRAND_PRIMARY;
};

export const getHeaderBackground = (company) => {
  const base = getPrimaryColor(company);
  const darker = tinycolor(base).darken(10).toHexString();
  return `linear-gradient(135deg, ${base}, ${darker})`;
};

export const getHeaderLogo = (company) => {
  if (company?.branding?.logoUrl) {
    return company.branding.logoUrl;
  }
  return '/branding/logo/logo-icon.svg';
};
