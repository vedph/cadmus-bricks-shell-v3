import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import {
  AssertedCompositeId,
  AssertedCompositeIdComponent,
} from '@myrmidon/cadmus-refs-asserted-ids';

export const ANIMAL_ENTRIES: ThesaurusEntry[] = [
  // - y=1 x=1
  { id: 'animal', value: 'animals' },
  // -- y=2 x=1
  { id: 'animal.mammal', value: 'animal: mammals' },
  // --- y=3 x=1-26
  { id: 'animal.mammal.dog', value: 'animal: mammals: dogs' },
  { id: 'animal.mammal.cat', value: 'animal: mammals: cats' },
  { id: 'animal.mammal.mouse', value: 'animal: mammals: mice' },
  { id: 'animal.mammal.elephant', value: 'animal: mammals: elephants' },
  { id: 'animal.mammal.lion', value: 'animal: mammals: lions' },
  { id: 'animal.mammal.tiger', value: 'animal: mammals: tigers' },
  { id: 'animal.mammal.bear', value: 'animal: mammals: bears' },
  { id: 'animal.mammal.wolf', value: 'animal: mammals: wolves' },
  { id: 'animal.mammal.fox', value: 'animal: mammals: foxes' },
  { id: 'animal.mammal.deer', value: 'animal: mammals: deer' },
  { id: 'animal.mammal.rabbit', value: 'animal: mammals: rabbits' },
  { id: 'animal.mammal.horse', value: 'animal: mammals: horses' },
  { id: 'animal.mammal.cow', value: 'animal: mammals: cows' },
  { id: 'animal.mammal.goat', value: 'animal: mammals: goats' },
  { id: 'animal.mammal.sheep', value: 'animal: mammals: sheep' },
  { id: 'animal.mammal.pig', value: 'animal: mammals: pigs' },
  { id: 'animal.mammal.zebra', value: 'animal: mammals: zebras' },
  { id: 'animal.mammal.giraffe', value: 'animal: mammals: giraffes' },
  { id: 'animal.mammal.kangaroo', value: 'animal: mammals: kangaroos' },
  { id: 'animal.mammal.monkey', value: 'animal: mammals: monkeys' },
  { id: 'animal.mammal.chimpanzee', value: 'animal: mammals: chimpanzees' },
  { id: 'animal.mammal.whale', value: 'animal: mammals: whales' },
  { id: 'animal.mammal.dolphin', value: 'animal: mammals: dolphins' },
  { id: 'animal.mammal.bat', value: 'animal: mammals: bats' },
  { id: 'animal.mammal.hedgehog', value: 'animal: mammals: hedgehogs' },
  { id: 'animal.mammal.squirrel', value: 'animal: mammals: squirrels' },
  // -- y=2 x=2
  { id: 'animal.bird', value: 'animal: birds' },
  // --- y=3 x=1-12
  { id: 'animal.bird.eagle', value: 'animal: birds: eagles' },
  { id: 'animal.bird.sparrow', value: 'animal: birds: sparrows' },
  { id: 'animal.bird.pigeon', value: 'animal: birds: pigeons' },
  { id: 'animal.bird.owl', value: 'animal: birds: owls' },
  { id: 'animal.bird.hawk', value: 'animal: birds: hawks' },
  { id: 'animal.bird.parrot', value: 'animal: birds: parrots' },
  { id: 'animal.bird.crow', value: 'animal: birds: crows' },
  { id: 'animal.bird.flamingo', value: 'animal: birds: flamingos' },
  { id: 'animal.bird.pelican', value: 'animal: birds: pelicans' },
  { id: 'animal.bird.penguin', value: 'animal: birds: penguins' },
  { id: 'animal.bird.swan', value: 'animal: birds: swans' },
  { id: 'animal.bird.goose', value: 'animal: birds: geese' },
  // - y=1 x=2
  { id: 'plant', value: 'plants' },
  // -- y=2 x=1-25
  { id: 'plant.tree', value: 'plant: trees' },
  { id: 'plant.flower', value: 'plant: flowers' },
  { id: 'plant.shrub', value: 'plant: shrubs' },
  { id: 'plant.grass', value: 'plant: grasses' },
  { id: 'plant.fern', value: 'plant: ferns' },
  { id: 'plant.cactus', value: 'plant: cacti' },
  { id: 'plant.bamboo', value: 'plant: bamboos' },
  { id: 'plant.moss', value: 'plant: mosses' },
  { id: 'plant.palm', value: 'plant: palms' },
  { id: 'plant.vine', value: 'plant: vines' },
  { id: 'plant.herb', value: 'plant: herbs' },
  { id: 'plant.algae', value: 'plant: algae' },
  { id: 'plant.bulb', value: 'plant: bulbs' },
  { id: 'plant.succulent', value: 'plant: succulents' },
  { id: 'plant.conifer', value: 'plant: conifers' },
  { id: 'plant.lichen', value: 'plant: lichens' },
  { id: 'plant.reed', value: 'plant: reeds' },
  { id: 'plant.clover', value: 'plant: clovers' },
  { id: 'plant.bryophyte', value: 'plant: bryophytes' },
  { id: 'plant.corn', value: 'plant: corn' },
  { id: 'plant.wheat', value: 'plant: wheat' },
  { id: 'plant.rice', value: 'plant: rice' },
  { id: 'plant.oak', value: 'plant: oaks' },
  { id: 'plant.pine', value: 'plant: pines' },
  { id: 'plant.maple', value: 'plant: maples' },
  // - y=1 x=3
  { id: 'mineral', value: 'minerals' },
];

@Component({
  selector: 'app-asserted-composite-id-pg',
  templateUrl: './asserted-composite-id-pg.component.html',
  styleUrls: ['./asserted-composite-id-pg.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    AssertedCompositeIdComponent,
  ],
})
export class AssertedCompositeIdPgComponent {
  // form
  public pinByTypeMode: FormControl<boolean>;
  public canSwitchMode: FormControl<boolean>;
  public canEditTarget: FormControl<boolean>;
  public form: FormGroup;
  // data
  public id?: AssertedCompositeId;
  public idTagEntries: ThesaurusEntry[];
  public assTagEntries: ThesaurusEntry[];
  public refTypeEntries: ThesaurusEntry[];
  public refTagEntries: ThesaurusEntry[];
  public featureEntries: ThesaurusEntry[] = ANIMAL_ENTRIES;

  constructor(formBuilder: FormBuilder) {
    // form
    this.pinByTypeMode = formBuilder.control(false, { nonNullable: true });
    this.canSwitchMode = formBuilder.control(true, { nonNullable: true });
    this.canEditTarget = formBuilder.control(true, { nonNullable: true });
    // form group
    this.form = formBuilder.group({
      pinByTypeMode: this.pinByTypeMode,
      canSwitchMode: this.canSwitchMode,
      canEditTarget: this.canEditTarget,
    });
    this.idTagEntries = [
      {
        id: 'idt1',
        value: 'id-tag-1',
      },
      {
        id: 'idt2',
        value: 'id-tag-2',
      },
      {
        id: '-',
        value: '---',
      },
    ];
    this.assTagEntries = [
      {
        id: 'ast1',
        value: 'ass-tag-1',
      },
      {
        id: 'ast2',
        value: 'ass-tag-2',
      },
      {
        id: '-',
        value: '---',
      },
    ];
    this.refTypeEntries = [
      {
        id: 'book',
        value: 'book',
      },
      {
        id: 'ms',
        value: 'manuscript',
      },
    ];
    this.refTagEntries = [
      {
        id: 'a',
        value: 'alpha',
      },
      {
        id: 'b',
        value: 'beta',
      },
      {
        id: '-',
        value: '---',
      },
    ];
    this.id = {
      target: {
        gid: 'http://www.guys.com/john_doe',
        label: 'John Doe',
      },
    };
  }

  public onIdChange(id: AssertedCompositeId | undefined): void {
    this.id = id;
  }
}
