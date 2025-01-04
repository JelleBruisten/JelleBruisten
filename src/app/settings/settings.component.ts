import { Component, inject } from '@angular/core';
import { BackgroundControlComponent } from "../graphics/background-control.component";
import { SettingsService } from './setting.service';

@Component({
  selector: 'app-settings',
  imports: [BackgroundControlComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export default class SettingsComponent {
  protected service = inject(SettingsService);
}
