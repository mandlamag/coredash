import React from 'react';
import { Button, Dialog, TextLink } from '@neo4j-ndl/react';
import { BookOpenIconOutline, BeakerIconOutline } from '@neo4j-ndl/react/icons';
import { Section, SectionTitle, SectionContent } from './ModalUtils';

export const version = '2.4.9-labs';

export const NeoAboutModal = ({ open, handleClose, getDebugState }) => {
  const downloadDebugFile = () => {
    const element = document.createElement('a');
    const state = getDebugState();
    state.version = version;
    const file = new Blob([JSON.stringify(state, null, 2)], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'ledgercore-debug-state.json';
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  return (
    <>
      <Dialog onClose={handleClose} open={open} aria-labelledby='form-dialog-title' size='large'>
        <Dialog.Header>About LedgerCore</Dialog.Header>
        <Dialog.Content>
          <div className='n-flex n-flex-col n-gap-token-4 n-divide-y n-divide-neutral-border-strong'>
            <Section>
              <SectionContent>
                LedgerCore is a dashboard builder for blockchain data analysis. With LedgerCore, you can build powerful visualizations of blockchain data in minutes.
              </SectionContent>
            </Section>
            <Section>
              <SectionTitle>Core Features</SectionTitle>
              <SectionContent>
                <ul className='n-list-disc n-pl-token-8'>
                  <li>
                    An editor to write and execute&nbsp;
                    <TextLink externalLink target='_blank' href='https://neo4j.com/developer/cypher/'>
                      Cypher
                    </TextLink>
                    &nbsp;queries.
                  </li>
                  <li>
                    Use results of your Cypher queries to create tables, bar charts, graph visualizations, and more.
                  </li>
                  <li>Style your reports, group them together in pages, and add interactivity between reports.</li>
                  <li>Save and share your dashboards with your friends.</li>
                </ul>
                No connectors or data pre-processing needed, it works directly with Neo4j!
              </SectionContent>
            </Section>
            <Section>
              <SectionTitle>Getting Started</SectionTitle>
              <SectionContent>
                You will automatically start with an empty dashboard when starting up LedgerCore for the first time.
                <br />
                Click the{' '}
                <strong>
                  (<BookOpenIconOutline className='icon-base icon-inline text-r' /> Documentation)
                </strong>
                &nbsp;button to see some example queries and visualizations.
              </SectionContent>
            </Section>
            <Section>
              <SectionTitle>Extending LedgerCore</SectionTitle>
              <SectionContent>
                LedgerCore is built with React and uses modern visualization libraries to power the dashboard components. It integrates with a GraphQL API to efficiently retrieve and display blockchain data. You can also extend LedgerCore with your own visualizations. Check out the developer guide in the{' '}
                <TextLink target='_blank' href='https://github.com/silversixpence-crypto/ledgercore-dash'>
                  project repository
                </TextLink>
                .
              </SectionContent>
            </Section>
            <Section>
              <SectionTitle>Contact</SectionTitle>
              <SectionContent>
                For suggestions, feature requests and other feedback: create an issue on the&nbsp;
                <TextLink target='_blank' href='https://github.com/silversixpence-crypto/ledgercore-dash'>
                  GitHub repository
                </TextLink>
                .
              </SectionContent>
            </Section>
          </div>
          <div className='n-flex n-flex-row n-justify-between n-mt-token-8'>
            <div>
              <Button onClick={downloadDebugFile} fill='outlined' color='neutral' size='small'>
                Debug Report
                <BeakerIconOutline className='btn-icon-sm-r' />
              </Button>
            </div>
            <div>
              <i style={{ float: 'right', fontSize: '11px' }}>v{version}</i>
            </div>
          </div>
        </Dialog.Content>
      </Dialog>
    </>
  );
};

export default NeoAboutModal;
