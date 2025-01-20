import { Component, inject } from '@angular/core';
import { BackgroundControlComponent } from "../graphics/background-control.component";
import { SettingsService } from './setting.service';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-settings',
  imports: [BackgroundControlComponent, JsonPipe],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export default class SettingsComponent {
  protected service = inject(SettingsService);

  updateDarkMode(event: Event) {
    if(!event.currentTarget) {
      return;
    }


    this.service.darkLevel.set(Number((event.currentTarget as HTMLInputElement).value));
  }
}
