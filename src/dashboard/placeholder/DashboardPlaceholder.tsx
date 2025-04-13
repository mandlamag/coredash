import React from 'react';
import { LoadingSpinner } from '@neo4j-ndl/react';
import { WalletIconSolid } from '@neo4j-ndl/react/icons';
import { LedgerCoreDashboardHeaderLogo } from '../header/DashboardHeaderLogo';

export const LedgerCoreDashboardPlaceholder = () => {
  return (
    <>
      <div className='n-w-screen n-flex n-flex-row n-items-center n-bg-neutral-bg-weak n-border-b n-border-neutral-border-weak'>
        <div className='n-relative n-bg-neutral-bg-weak n-w-full'>
          <div className='n-min-w-full'>
            <div className='n-flex n-justify-between n-h-16 n-items-center n-py-6 md:n-justify-start md:n-space-x-10 n-mx-4'>
              <LedgerCoreDashboardHeaderLogo />
              <nav className='n-items-center n-justify-center n-flex n-flex-1 n-w-full'>
                <div className='n-flex n-items-center n-gap-2'>
                  <span className='n-text-lg n-font-semibold'>Loading your dashboard</span>
                  <span className='n-animate-pulse'>
                    <WalletIconSolid className='n-text-[#FF8C00]' style={{ width: '24px', height: '24px' }} />
                  </span>
                </div>
              </nav>
              <div className='sm:n-flex n-items-center n-justify-end md:n-flex-1 lg:n-w-0 n-gap-6'></div>
            </div>
          </div>
        </div>
      </div>
      <div className='n-w-full n-h-full n-overflow-y-scroll n-flex n-flex-row'>
        <div className='n-flex-1 n-relative n-z-0  n-scroll-smooth n-w-full'>
          <div className='n-absolute n-inset-0 page-spacing'>
            <div className='page-spacing-overflow'>
              <div className='n-absolute n-w-full n-h-full'>
                <div className='n-flex n-flex-col n-items-center n-justify-center n-h-full n-gap-4'>
                  <LoadingSpinner size='large' className='centered' />
                  <div className='n-text-lg n-font-medium n-text-palette-neutral-text-weak'>
                    Preparing your Bitcoin analytics dashboard...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LedgerCoreDashboardPlaceholder;
