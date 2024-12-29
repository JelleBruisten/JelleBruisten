import { Component } from '@angular/core';
import { BackgroundComponent } from "./graphics/background.component";

@Component({
  imports: [
    BackgroundComponent
],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  // blockMainThread() {
  //   const ms = 5000;
  //   const start = new Date().getTime();
  //   let end = start;
  //   while(end < start + ms) {
  //     end = new Date().getTime();
  //  }
  // }
}
