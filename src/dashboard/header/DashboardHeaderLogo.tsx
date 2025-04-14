import React from 'react';

import { DASHBOARD_HEADER_BRAND_LOGO, IS_CUSTOM_LOGO } from '../../config/ApplicationConfig';
import StyleConfig from '../../config/StyleConfig';
import { Typography } from '@neo4j-ndl/react';
import { WalletIconSolid } from '@neo4j-ndl/react/icons';

await StyleConfig.getInstance();

export const LedgerCoreDashboardHeaderLogo = () => {
  const content = (
    <div className='n-items-center sm:n-flex md:n-flex-1 n-justify-start'>
      <div className='n-flex n-items-center n-gap-2'>
        <WalletIconSolid className='n-mr-2 n-ml-2 n-text-[#FF8C00]' style={{ width: '28px', height: '28px' }} />
        <Typography variant='h5' className='n-font-bold n-flex n-items-center'>
          <span className='n-text-black dark:n-text-[#FF8C00]'>Ledger</span>
          <span>Core</span>
        </Typography>
      </div>
    </div>
  );

  return content;
};

export default LedgerCoreDashboardHeaderLogo;
