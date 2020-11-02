/*
 * @flow strict-local
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import Layout from '../layout';
import formatUserDate from '../utility/formatUserDate';

import LabelUrlList from './components/LabelUrlList';
import FilterLink from './FilterLink';
import type {ReportDataT, ReportLabelUrlT} from './types';

const DiscogsLinksWithMultipleLabels = ({
  $c,
  canBeFiltered,
  filtered,
  generated,
  items,
  pager,
}: ReportDataT<ReportLabelUrlT>): React.Element<typeof Layout> => (
  <Layout
    $c={$c}
    fullWidth
    title={l('Discogs URLs linked to multiple labels')}
  >
    <h1>{l('Discogs URLs linked to multiple labels')}</h1>

    <ul>
      <li>
        {l(`This report shows Discogs URLs which are linked
            to multiple labels.`)}
      </li>
      <li>
        {texp.l('Total labels found: {count}',
                {count: pager.total_entries})}
      </li>
      <li>
        {texp.l('Generated on {date}',
                {date: formatUserDate($c, generated)})}
      </li>

      {canBeFiltered ? <FilterLink $c={$c} filtered={filtered} /> : null}
    </ul>

    <LabelUrlList items={items} pager={pager} />

  </Layout>
);

export default DiscogsLinksWithMultipleLabels;
