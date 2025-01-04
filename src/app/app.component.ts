import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BackgroundComponent } from "./graphics/background.component";
import { BackgroundControlComponent } from "./graphics/background-control.component";
import { BackgroundService } from './graphics/background.service';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [
    BackgroundComponent,
    RouterOutlet
],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  service = inject(BackgroundService);
}
