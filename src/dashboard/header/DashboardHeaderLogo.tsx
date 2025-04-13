import React from 'react';

import { DASHBOARD_HEADER_BRAND_LOGO, IS_CUSTOM_LOGO } from '../../config/ApplicationConfig';
import StyleConfig from '../../config/StyleConfig';
import { Typography } from '@neo4j-ndl/react';

await StyleConfig.getInstance();

export const LedgerCoreDashboardHeaderLogo = ({ resetApplication }) => {
  const content = (
    <div className='n-items-center sm:n-flex md:n-flex-1 n-justify-start'>
      <a className='n-cursor-pointer'>
        <img onClick={resetApplication} className='n-h-10 n-w-auto n-m-2' src={DASHBOARD_HEADER_BRAND_LOGO} alt='Logo' />
      </a>
      <Typography variant='h5' className='n-font-bold'>LedgerCore</Typography>
    </div>
  );

  return content;
};

export default LedgerCoreDashboardHeaderLogo;
