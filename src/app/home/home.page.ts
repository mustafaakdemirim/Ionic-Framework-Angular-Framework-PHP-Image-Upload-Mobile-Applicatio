import { HttpClient } from '@angular/common/http';
import {finalize} from 'rxjs/operators';
import { Component } from '@angular/core';
import { Camera,CameraResultType,CameraSource,Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Platform, LoadingController, IonicSafeString, AnimationBuilder } from '@ionic/angular';
import { IonItemSliding } from '@ionic/angular';
import { ToastController } from '@ionic/angular';

interface ToastButton {
  text?: string;
  icon?: string;
  side?: 'start' | 'end';
  role?: 'cancel' | string;
  cssClass?: string | string[];
  handler?: () => boolean | void | Promise<boolean | void>;
}

const RESİM_DIZINI = 'stored-images';
interface LokalDosya{
ad: string;
yol: string;
veri: string;
}
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  resimler: LokalDosya[] = [];
  constructor(private platform: Platform, private loadingController: LoadingController, private httpClient: HttpClient) {
    this.resimleriCek();
  }

  share(slidingItem: IonItemSliding) {
    slidingItem.close();
  }

  async presentToast() {
    const toastController = new ToastController();
      const toast = await toastController.create({
        icon: 'checkmark-done-sharp',
        message: 'İşleminiz Başarıyla Gerçekleşti.',
        duration: 2000,
        position: 'top',
        color: 'warning'
      });
    toast.present();
  }


  async dosyaYukleme(dosyaIsimleri: string[]){
    dosyaIsimleri.forEach(async r => {
        const dosyaYolu = `${RESİM_DIZINI}/${r}`;

        const okunanDosya = await Filesystem.readFile({
        directory: Directory.Data,
        path:dosyaYolu
        });

        this.resimler.push({
            ad: r,
            yol: dosyaYolu,
            veri: `data:image/jpeg;base64, ${okunanDosya.data}`
        });
      });
  }

  async resimSec(){
    const resim = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos
    });

    if(resim)
    {
      this.resmiKaydet(resim);
    }
  }

  convertBlobtoBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onerror = reject;
    okuyucu.onload = () => {
      resolve(okuyucu.result);
      };
    okuyucu.readAsDataURL(blob);
  });

  async yuklemeyiBaslat(file: LokalDosya){
    const cevap = await fetch(file.veri);
    const blob = await cevap.blob();
    const formData = new FormData();
    formData.append('file', blob,file.ad);
    this.veriYukle(formData);
  }

  async readBase64(foto: Photo){
    if(this.platform.is('hybrid')){
      const dosya = await Filesystem.readFile({
          path: foto.path
        });
      return dosya.data;
    }
    else
    {
      const cevap = await fetch(foto.webPath);
      const blob = await cevap.blob();
      return await this.convertBlobtoBase64(blob) as string;
    }
  }

  async veriYukle(formData: FormData){
    const yükleniyor = await this.loadingController.create({
      message: 'Resim Yükleniyor...'
    });
    await yükleniyor.present();
    const link = 'http://localhost/imageupload/upload.php';
    this.httpClient.post(link,formData).pipe(
      finalize(() => {
        yükleniyor.dismiss();
      })).subscribe(response => {
        console.log(response);
      });
  }



  async resimSil(dosya: LokalDosya){
    await Filesystem.deleteFile({
      directory: Directory.Data,
      path: dosya.yol
      });
    this.resimleriCek();
  }



  async resmiKaydet(foto: Photo){
    const base64Veri = await this.readBase64(foto);
    const dosyaAdı = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      directory: Directory.Data,
      path: `${RESİM_DIZINI}/${dosyaAdı}`,
      data: base64Veri
      });
    this.resimleriCek();
  }

  async resimleriCek(){
    this.resimler = [];
    const yukleniyor = await this.loadingController.create({
      message: 'Yükleniyor...'
    });
    await yukleniyor.present();

    Filesystem.readdir({
      directory: Directory.Data,
      path: RESİM_DIZINI
    }).then(result => {
        this.dosyaYukleme(result.files);
    }, async err => {
      await Filesystem.mkdir({
        directory: Directory.Data,
        path: RESİM_DIZINI
      });
    }).then(() => {
      yukleniyor.dismiss();
    });
  }
}
