/*
 * Copyright (C) 2015 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import $ from 'jquery';

import MB from '../../../common/MB';

MB.Control.ArtistEdit = function () {
  var self = {};

  self.$name = $('#id-edit-artist\\.name');
  self.$begin = $('#label-id-edit-artist\\.period\\.begin_date');
  self.$ended = $('#label-id-edit-artist\\.period\\.ended');
  self.$end = $('#label-id-edit-artist\\.period\\.end_date');
  self.$beginarea = $('#label-id-edit-artist\\.begin_area\\.name');
  self.$endarea = $('#label-id-edit-artist\\.end_area\\.name');
  self.$type = $('#id-edit-artist\\.type_id');
  self.$gender = $('#id-edit-artist\\.gender_id');
  self.old_gender = self.$gender.val();

  self.changeDateText = function (begin, end, ended) {
    self.$begin.text(begin);
    self.$end.text(end);
    self.$ended.text(ended);
  };

  self.changeAreaText = function (begin, end) {
    self.$beginarea.text(begin);
    self.$endarea.text(end);
  };

  /*
   * Sets the label descriptions depending upon the artist type:
   *
   *   Unknown: 0
   *   Person: 1
   *   Group: 2
   *   Orchestra: 5
   *   Choir: 6
   */
  self.typeChanged = function () {
    switch (self.$type.val()) {
      default:
      case '0':
        self.changeDateText(
          l('Began:'),
          l('Ended:'),
          l('This artist has ended.'),
        );
        self.changeAreaText(l('Begin area:'), l('End area:'));
        self.enableGender();
        break;

      case '1':
        self.changeDateText(
          l('Born:'),
          l('Died:'),
          l('This person is deceased.'),
        );
        self.changeAreaText(l('Born in:'), l('Died in:'));
        self.enableGender();
        break;

      case '2':
      case '5':
      case '6':
        self.changeDateText(
          l('Founded:'),
          l('Dissolved:'),
          l('This group has dissolved.'),
        );
        self.changeAreaText(l('Founded in:'), l('Dissolved in:'));
        self.disableGender();
        break;
    }
  };

  self.enableGender = function () {
    if (self.$gender.prop('disabled')) {
      self.$gender
        .prop('disabled', false)
        .val(self.old_gender);
    }
  };

  self.disableGender = function () {
    self.$gender.prop('disabled', true);
    self.old_gender = self.$gender.val();
    self.$gender.val('');
  };

  self.typeChanged();
  self.$type.bind('change.mb', self.typeChanged);

  MB.Control.RangeSelect(
    '#artist-credit-renamer span.rename-artist-credit input[type="checkbox"]',
  );

  MB.Control.initializeGuessCase('artist', 'id-edit-artist');

  MB.Control.Area('#area', '#begin_area', '#end_area');

  return self;
};
